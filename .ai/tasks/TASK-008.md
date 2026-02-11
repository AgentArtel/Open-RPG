## TASK-008: Build AgentRunner (Core LLM Loop)

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-006 (PerceptionEngine), TASK-007 (Skill System)
- **Blocks**: TASK-009 (AgentManager + bridge integration)

### Context

The AgentRunner is the core think-act loop for each NPC agent. It coordinates:
perception → system prompt → LLM call → tool call parsing → skill execution → memory.
It implements `IAgentRunner` from `src/agents/core/types.ts`.

The LLMClient wraps the `openai` npm package pointed at Moonshot's API
(`https://api.moonshot.ai/v1`). The LaneQueue ensures serial execution per agent.

### Objective

A working AgentRunner that can process an `AgentEvent` through the full LLM loop
for a single NPC, plus the LLMClient and LaneQueue implementations.

### Specifications

**Create files:**
- `src/agents/core/AgentRunner.ts` — implements `IAgentRunner`
- `src/agents/core/LLMClient.ts` — implements `ILLMClient`
- `src/agents/core/LaneQueue.ts` — implements `ILaneQueue`
- `src/agents/core/index.ts` — module exports

**AgentRunner — `run(event: AgentEvent)`:**

1. Enqueue via LaneQueue (serial execution per agent)
2. Generate perception snapshot via PerceptionEngine
3. Build system prompt: personality + skills list + perception + rules
4. Select model based on event type:
   - `idle_tick` → Kimi K2 (cheap, fast)
   - `player_action` / `player_proximity` → Kimi K2.5 (capable)
5. Build messages array from memory (recent context)
6. Add current event as user message
7. Call LLM with system prompt + messages + tool definitions
8. If LLM returns tool calls → execute skills → feed results back → loop
9. If LLM returns text → store in memory → return `AgentRunResult`
10. On error → log, return failed result, NPC falls back to canned behavior

**AgentRunner — `buildSystemPrompt(perception)`:**
Assemble sections in order:
```
[Identity]     — From AgentConfig.personality
[World]        — "You are in {map}. {perception.summary}"
[Skills]       — "You can: move, say, look, emote, wait"
[Memory]       — Recent conversation context (if any)
[Rules]        — Stay in character, keep responses short (<200 chars),
                 don't break the fourth wall
[Current State] — Serialized perception snapshot
```

**LLMClient — wraps `openai` SDK:**

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.ai/v1',
});
```

- `complete(messages, options)` → calls `client.chat.completions.create()`
- Map our `LLMMessage[]` to OpenAI message format
- Map our `ToolDefinition[]` to OpenAI tool format
- Parse response: extract text, tool_calls, usage, stop reason
- Map OpenAI response back to our `LLMResponse` type
- Handle errors: classify into `context_overflow`, `rate_limit`, `timeout`, `auth_error`

**Model selection:**
- Idle behavior: `kimi-k2-0905-chat` (or env override `KIMI_IDLE_MODEL`)
- Conversation: `kimi-k2.5` (or env override `KIMI_CONVERSATION_MODEL`)
- Context caching is automatic with Kimi — no config needed

**LaneQueue (~50 lines):**
- Map of `agentId → Promise chain`
- `enqueue(agentId, task)` — append to chain, return when done
- `isProcessing(agentId)` — check if chain is active
- `getQueueLength(agentId)` — count pending tasks

**Tool call loop:**
- Max iterations: 5 (prevent infinite tool-calling loops)
- For each tool call: look up skill in registry → execute → collect result
- Feed all tool results back as tool_result messages → call LLM again
- If LLM responds with text (no more tool calls) → done

### Acceptance Criteria

- [x] `AgentRunner` implements `IAgentRunner`
- [x] `LLMClient` implements `ILLMClient` using `openai` SDK + Moonshot API
- [x] `LaneQueue` implements `ILaneQueue`
- [x] `run()` executes full loop: perception → prompt → LLM → skills → memory
- [x] Model selected based on event type (K2 for idle, K2.5 for conversation)
- [x] Tool calls parsed and executed correctly (with loop limit)
- [x] Results stored in memory via `IAgentMemory`
- [x] Errors caught and handled (never crash the game server)
- [x] `buildSystemPrompt()` includes all required sections
- [x] `rpgjs build` passes
- [x] `npx tsc --noEmit` passes

### Do NOT

- Build AgentManager yet (that's TASK-009 — multi-agent orchestration)
- Implement complex retry/backoff logic (basic error handling is fine)
- Add streaming support yet (batch responses are fine for MVP)
- Use `@anthropic-ai/sdk` — we use `openai` SDK pointed at Moonshot
- Hard-code model names — read from AgentConfig or env vars

### Reference

- Interfaces: `src/agents/core/types.ts` (IAgentRunner, ILLMClient, ILaneQueue, AgentRunResult)
- Perception: `src/agents/perception/` (TASK-006 output)
- Skills: `src/agents/skills/` (TASK-007 output)
- Memory: `src/agents/memory/types.ts` (IAgentMemory — use a minimal stub if needed)
- LLM test: `src/agents/core/llm-test.ts` (shows working Moonshot API call pattern)
- OpenClaw runner: `docs/openclaw-reference/src/agents/pi-embedded-runner/run.ts`
- OpenClaw queue: `docs/openclaw-reference/src/process/command-queue.ts`
- OpenClaw patterns: `docs/openclaw-patterns.md` — Patterns 1 (LaneQueue) & 2 (AgentRunner)
- Prior art: `docs/prior-art-analysis.md` — AI Town async decoupling, Stanford react-and-replan
- **Plugin analysis**: `docs/rpgjs-plugin-analysis.md` — thinking indicator via
  `EmotionBubble.ThreeDot` while LLM processes; `showText()` for modal dialogue
  on `player_action`; sprite-attached bubble for proximity greetings (Phase 4)

### Handoff Notes

**Implemented (2026-02-11):**
- `AgentRunner.ts`, `LLMClient.ts`, `LaneQueue.ts`, `core/index.ts` created. InMemoryAgentMemory used from memory module.
- Model: idle and conversation both default to `kimi-k2-0711-preview` (K2.5 ID not available for account); env `KIMI_IDLE_MODEL` / `KIMI_CONVERSATION_MODEL` override.
- Unit tests: `src/agents/core/test-manual.ts` (5 tests), `src/agents/core/test-edge-cases.ts` (10 tests) — all pass.
- Live test: `main/events/agent-runner-test-npc.ts` — NPC uses real LLM, LaneQueue, idle every 15s and onAction; must call `laneQueue.enqueue(agentId, task)` with agentId as first arg.
- MapData `main/maps/simplemap.ts` added so TMX objects EV-1 (Villager) and start (StartEvent) get event classes; StartEvent has `through = true` so spawn point doesn’t block movement.
- Build and typecheck pass. Ready for Phase 4 (bridge) or TASK-009 (AgentManager).
