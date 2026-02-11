## TASK-008: Build AgentRunner (Core LLM Loop)

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-005, TASK-006, TASK-007
- **Blocks**: TASK-009

### Context

The AgentRunner is the core think-act loop for each agent. It implements `IAgentRunner` and coordinates: getting perception → calling LLM → parsing tool calls → executing skills → updating memory.

### Objective

A working AgentRunner that can run the complete agent loop for a single NPC.

### Specifications

**Create files:**
- `src/agents/core/AgentRunner.ts` — implements `IAgentRunner`
- `src/agents/core/LLMClient.ts` — implements `ILLMClient` (Moonshot wrapper)
- `src/agents/core/LaneQueue.ts` — implements `ILaneQueue`
- `src/agents/core/index.ts` — module exports

**AgentRunner requirements:**

1. **`run(triggerEvent)`** — main entry point:
   - Queue the run request (use LaneQueue for serial execution)
   - Build system prompt (personality + context)
   - Get perception from PerceptionEngine
   - Call LLM with tools from SkillRegistry
   - Parse tool calls from LLM response
   - Execute skills
   - Store results in memory

2. **`buildSystemPrompt()`**:
   - Include agent personality from `AgentConfig`
   - Include available skills as tool definitions
   - Include current context (location, time, etc.)

3. **LLM integration**:
   - Use `kimi-k2-0711-preview` for idle behavior (faster, cheaper)
   - Use `kimi-k2.5-202501` for conversations (when triggered by player, more capable)
   - Support context caching for system prompts

**LLMClient requirements:**
- Wrap `@moonshot-ai/moonshot-sdk`
- Implement `complete(messages, tools, options)`
- Return structured `LLMResponse`
- Handle errors gracefully

**LaneQueue requirements:**
- Per-agent async serial execution
- `enqueue(task)` — add task to queue
- `isProcessing()` — check if busy
- Tasks execute one at a time, in order

### Acceptance Criteria

- [ ] `AgentRunner` implements `IAgentRunner`
- [ ] `LLMClient` implements `ILLMClient`
- [ ] `LaneQueue` implements `ILaneQueue`
- [ ] `run()` executes full loop: perception → LLM → skills → memory
- [ ] System prompt includes personality and available tools
- [ ] Tool calls from LLM are parsed and executed correctly
- [ ] Results stored in memory via `IAgentMemory`
- [ ] Errors handled gracefully (don't crash the game)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Handle multiple agents yet (that's AgentManager in TASK-009)
- Optimize for performance yet (get it working first)
- Add complex retry logic (basic error handling is fine for MVP)

### Reference

- Interfaces: `src/agents/core/types.ts`
- PerceptionEngine: `src/agents/perception/PerceptionEngine.ts` (TASK-006)
- SkillRegistry: `src/agents/skills/SkillRegistry.ts` (TASK-007)
- OpenClaw patterns: `docs/openclaw-patterns.md` (LaneQueue, AgentRunner patterns)

### Handoff Notes

_(To be filled by implementer)_
