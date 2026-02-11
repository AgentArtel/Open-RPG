## TASK-007: Build Skill System with 5 MVP Skills

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-003, TASK-005
- **Blocks**: TASK-008

### Context

The Skill System defines game commands that agents can execute. Each skill is a tool the LLM can call (via function calling). This implements `ISkillRegistry` and `IAgentSkill` from the interfaces.

### Objective

A working Skill System with 5 MVP skills that agents can use to interact with the game world.

### Specifications

**Create files:**
- `src/agents/skills/SkillRegistry.ts` — implements `ISkillRegistry`
- `src/agents/skills/skills/move.ts` — move to adjacent tile
- `src/agents/skills/skills/look.ts` — observe surroundings
- `src/agents/skills/skills/say.ts` — speak to nearby players
- `src/agents/skills/skills/wait.ts` — do nothing for a moment
- `src/agents/skills/skills/goto.ts` — navigate to coordinates
- `src/agents/skills/index.ts` — module exports

**Skill requirements:**

1. **`move`** — Move one tile in a direction
   - Params: `direction: enum('up', 'down', 'left', 'right')`
   - Execute: Use `RpgPlayer.move()` or similar

2. **`look`** — Look around and describe surroundings
   - Params: none
   - Execute: Returns perception snapshot (from PerceptionEngine)

3. **`say`** — Speak to nearby players
   - Params: `message: string`
   - Execute: Use `RpgPlayer.showText()` or broadcast

4. **`wait`** — Wait for a moment
   - Params: `durationMs: number` (optional, default 1000)
   - Execute: SetTimeout or RPGJS tick wait

5. **`goto`** — Navigate to specific coordinates
   - Params: `x: number, y: number`
   - Execute: Calculate path and move (use `infiniteMoveRoute` or step-by-step)

**SkillRegistry requirements:**
- Register skills by name
- `getToolDefinitions()` returns Moonshot-compatible tool format
- `executeSkill(name, params, context)` runs the skill
- `SkillResult` returned with success/error status

### Acceptance Criteria

- [ ] `SkillRegistry` implements `ISkillRegistry`
- [ ] All 5 skills implement `IAgentSkill`
- [ ] `getToolDefinitions()` returns valid Moonshot tool format
- [ ] Each skill has: name, description, parameter schema, execute function
- [ ] Skills receive `GameContext` (event, agentId, position, map)
- [ ] `executeSkill()` returns `SkillResult`
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: can register and execute each skill

### Do NOT

- Connect to LLM yet (just build the skill infrastructure)
- Build complex pathfinding for `goto` (simple approach is fine for MVP)
- Add more than 5 skills (these are the MVP set)

### Reference

- Interface: `src/agents/skills/types.ts`
- RPGJS movement: `main/events/test-npc.ts` (`Move.tileRandom()`, `infiniteMoveRoute`)
- RPGJS player API: `docs/rpgjs-reference/docs/guide/player.md`
- Moonshot AI function calling: https://platform.moonshot.ai/docs/api/chat#function-calling

### Handoff Notes

_(To be filled by implementer)_
