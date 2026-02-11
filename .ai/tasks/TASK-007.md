## TASK-007: Build Skill System with 5 MVP Skills

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-003 (interfaces), TASK-005 (LLM validated)
- **Blocks**: TASK-008

### Context

The Skill System defines game commands that agents can execute. Each skill is
a tool the LLM invokes via OpenAI-compatible function calling (works with
Kimi K2/K2.5). This implements `ISkillRegistry` and `IAgentSkill` from the
interfaces in `src/agents/skills/types.ts`.

### Objective

A working Skill System with 5 MVP skills and a registry that converts them to
OpenAI-compatible tool definitions for the LLM.

### Specifications

**Create files:**
- `src/agents/skills/SkillRegistry.ts` — implements `ISkillRegistry`
- `src/agents/skills/skills/move.ts` — move to adjacent tile
- `src/agents/skills/skills/say.ts` — speak to nearby players
- `src/agents/skills/skills/look.ts` — observe surroundings
- `src/agents/skills/skills/emote.ts` — express emotion/action
- `src/agents/skills/skills/wait.ts` — do nothing for a moment
- `src/agents/skills/index.ts` — module exports

**MVP skills (5):**

1. **`move`** — Move one tile in a direction
   - Params: `direction: enum('up', 'down', 'left', 'right')`
   - Execute: Use RPGJS movement on the event object
   - Result: "Moved one tile north" or error if blocked

2. **`say`** — Speak to a nearby player
   - Params: `message: string` (what to say), `target?: string` (player name)
   - Execute: Use `player.showText(message, { talkWith: event })` on nearest player
   - Result: "Said: 'Hello, traveler!'" or "No player nearby"

3. **`look`** — Observe surroundings (returns perception snapshot text)
   - Params: none
   - Execute: Generate a description of nearby entities and environment
   - Result: Current perception summary text

4. **`emote`** — Express an emotion or perform an action
   - Params: `action: enum('wave', 'nod', 'shake_head', 'laugh', 'think')`
   - Execute: Could trigger animation or just log for now
   - Result: "Waved at nearby players"

5. **`wait`** — Wait for a moment (idle/thinking)
   - Params: `durationMs?: number` (default 2000, max 10000)
   - Execute: Simple delay via setTimeout/Promise
   - Result: "Waited for 2 seconds"

**SkillRegistry requirements:**
- `register(skill)` — add a skill by name
- `get(name)` — retrieve skill by name
- `getAll()` — return all registered skills
- `getToolDefinitions()` — convert to OpenAI-compatible format:

```typescript
// OpenAI-compatible tool format (used by Kimi K2/K2.5 via openai SDK)
{
  type: 'function',
  function: {
    name: string,
    description: string,
    parameters: {
      type: 'object',
      properties: { ... },
      required: [...]
    }
  }
}
```

**IMPORTANT — Tool definition format:**
The existing `ToolDefinition` interface in `types.ts` uses Anthropic's
`input_schema` key. The OpenAI-compatible format (which Kimi uses) expects
`parameters` inside a `function` wrapper. The `getToolDefinitions()` method
should return the **OpenAI-compatible format** since we use the `openai` SDK.
You may need to update the `ToolDefinition` type or create a separate
`OpenAIToolDefinition` type. Coordinate with the interface.

- `executeSkill(name, params, context)` — run the skill, return `SkillResult`

**Error handling:**
- Every skill catches its own errors — never throws
- Returns `{ success: false, message: "...", error: "error_code" }` on failure
- Skills validate parameters before executing

### Acceptance Criteria

- [ ] `SkillRegistry` implements `ISkillRegistry`
- [ ] All 5 skills implement `IAgentSkill`
- [ ] `getToolDefinitions()` returns valid OpenAI-compatible tool format
- [ ] Each skill has: name, description, parameter schema, execute function
- [ ] Skills receive `GameContext` and use it to access the NPC event
- [ ] All skills return `SkillResult` (never throw)
- [ ] Parameter validation on each skill
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Connect to LLM yet (just build the skill infrastructure)
- Build complex pathfinding (that's a future `goto` skill)
- Add more than 5 skills (MVP set only)
- Use Anthropic-specific tool format (we use OpenAI-compatible via `openai` SDK)

### Reference

- Interface: `src/agents/skills/types.ts` (IAgentSkill, ISkillRegistry, SkillResult, GameContext)
- Bridge types: `src/agents/bridge/types.ts` (GameEvent, GamePlayer, NearbyPlayerInfo)
- Test NPC: `main/events/test-npc.ts` (shows RPGJS movement, showText patterns)
- RPGJS movement: `docs/rpgjs-reference/docs/guide/player.md`
- OpenClaw skills: `docs/openclaw-patterns.md` — Pattern 3: Skill/Tool System
- OpenClaw source: `docs/openclaw-reference/src/agents/pi-tools.ts`

### Handoff Notes

_(To be filled by implementer)_
