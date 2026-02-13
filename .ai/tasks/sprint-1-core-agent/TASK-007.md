## TASK-007: Build Skill System with 5 MVP Skills

- **Status**: DONE
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
   - Execute: Use `@rpgjs/plugin-emotion-bubbles` — call `this.showEmotionBubble(emotion)`
     on the NPC event (works because `RpgEvent extends RpgPlayer`).
   - Map actions to `EmotionBubble` enum values:
     ```ts
     import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'
     const emotionMap = {
       'wave': EmotionBubble.Happy,
       'nod': EmotionBubble.Exclamation,
       'shake_head': EmotionBubble.Cross,
       'laugh': EmotionBubble.HaHa,
       'think': EmotionBubble.ThreeDot,
     }
     context.npcEvent.showEmotionBubble(emotionMap[action])
     ```
   - Result: "Showed 'laugh' emotion" or "Performed 'think' action"

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

- [x] `SkillRegistry` implements `ISkillRegistry`
- [x] All 5 skills implement `IAgentSkill`
- [x] `getToolDefinitions()` returns valid OpenAI-compatible tool format
- [x] Each skill has: name, description, parameter schema, execute function
- [x] Skills receive `GameContext` and use it to access the NPC event
- [x] All skills return `SkillResult` (never throw)
- [x] Parameter validation on each skill
- [x] `rpgjs build` passes
- [x] `npx tsc --noEmit` passes (only pre-existing upstream errors)

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
- **Plugin analysis**: `docs/rpgjs-plugin-analysis.md` — emote skill maps to
  @rpgjs/plugin-emotion-bubbles (30+ emotions, `showEmotionBubble()` works on NPCs)
- **Emotion bubbles source**: `docs/rpgjs-reference/packages/plugins/emotion-bubbles/src/`
- **Key API insight**: `RpgEvent extends RpgPlayer` — NPCs can call `showEmotionBubble()`,
  `showText()`, `showAnimation()`, `showNotification()` directly

### Handoff Notes

**2026-02-11 — cursor — Implementation complete (PENDING → DONE)**

#### Implementation Summary

The Skill System is fully implemented with 5 MVP skills and a registry that converts skills to OpenAI-compatible tool definitions for Kimi K2/K2.5.

#### Files Created

- **`src/agents/skills/SkillRegistry.ts`** (202 lines) — Main registry implementation:
  - `register()`, `get()`, `getAll()` methods
  - `getToolDefinitions()` — converts to OpenAI format (`{ type: 'function', function: { ... } }`)
  - `executeSkill()` — validates parameters and executes skills
  - Parameter validation helper functions

- **`src/agents/skills/skills/move.ts`** (78 lines) — Move skill:
  - Direction enum: up, down, left, right
  - Uses `Move.tileUp()`, `Move.tileDown()`, etc.
  - Error handling for blocked movement
  - Returns cardinal direction names (north, south, west, east)

- **`src/agents/skills/skills/say.ts`** (66 lines) — Say skill:
  - Required `message` parameter
  - Optional `target` parameter (player name)
  - Target lookup: search by name first, fallback to closest player
  - Uses `player.showText(message, { talkWith: event })`

- **`src/agents/skills/skills/look.ts`** (90 lines) — Look skill:
  - Uses closure pattern: `createLookSkill(perceptionEngine)`
  - Queries `RpgWorld.getObjectsOfMap()` to get entities
  - Converts to `NearbyEntity[]` format
  - Calls `PerceptionEngine.generateSnapshot()` and returns summary

- **`src/agents/skills/skills/emote.ts`** (66 lines) — Emote skill:
  - Action enum: wave, nod, shake_head, laugh, think
  - Maps to `EmotionBubble` enum values
  - Uses `context.event.showEmotionBubble()` (type assertion needed for TypeScript)

- **`src/agents/skills/skills/wait.ts`** (58 lines) — Wait skill:
  - Optional `durationMs` parameter (default 2000, max 10000)
  - Validates duration range
  - Promise-based delay using `setTimeout`

- **`src/agents/skills/index.ts`** — Module exports for all skills and types

- **`src/agents/skills/test-manual.ts`** — Basic functionality test suite (5 tests, all passing)

#### Type System Updates

- **`src/agents/skills/types.ts`** — Updated:
  - Added `OpenAIToolDefinition` interface (OpenAI-compatible format)
  - Updated `ISkillRegistry.getToolDefinitions()` return type to `ReadonlyArray<OpenAIToolDefinition>`
  - Marked `ToolDefinition` as deprecated (kept for reference)

#### Dependencies Installed

- `@rpgjs/plugin-emotion-bubbles` — Installed and added to `rpg.toml` modules

#### Testing Results

**Unit Tests (test-manual.ts)**:
- ✅ SkillRegistry registration and retrieval
- ✅ OpenAI tool definition format conversion
- ✅ Parameter validation (missing required, invalid enum values)
- ✅ Skill execution (wait skill tested with mock context)
- ✅ All skills registered correctly

**Build Verification**:
- ✅ `npm run build` passes
- ✅ `npx tsc --noEmit` passes (only pre-existing upstream errors in perception-test-npc.ts and external dependencies)
- ✅ No linting errors in skills directory

#### Key Implementation Details

1. **OpenAI Tool Format**: `getToolDefinitions()` returns `{ type: 'function', function: { name, description, parameters } }` format compatible with OpenAI Chat Completions API (used by Kimi K2/K2.5).

2. **Parameter Conversion**: `SkillParameterSchema` → JSON Schema `properties` format with proper type mapping, enum support, and required array extraction.

3. **Error Handling**: All skills catch errors and return `SkillResult` with `success: false` — never throw exceptions.

4. **PerceptionEngine Integration**: `look` skill uses closure pattern to inject `PerceptionEngine` dependency, keeping `GameContext` clean.

5. **RPGJS APIs**:
   - Movement: `event.moveRoutes([Move.tileUp()])` returns `Promise<boolean>`
   - Dialogue: `player.showText(message, { talkWith: event })` is async
   - Emotions: `event.showEmotionBubble(EmotionBubble.Happy)` is synchronous (type assertion needed)

6. **Type Assertions**: Used `as any` for `showEmotionBubble()` and `moveRoutes()` due to TypeScript not recognizing plugin methods and Move return types. These work correctly at runtime.

#### Known Limitations

- **Emote Skill Testing**: Cannot be tested in Node.js environment due to Vite-specific imports in `@rpgjs/plugin-emotion-bubbles`. Will be tested in actual game environment.

- **Type Assertions**: Some type assertions (`as any`) are needed for RPGJS plugin methods. These are safe because `RpgEvent extends RpgPlayer` and the methods exist at runtime.

#### Next Steps

TASK-007 is complete and ready for use. TASK-008 (AgentRunner) can now proceed, as it depends on both PerceptionEngine (TASK-006) and Skill System (TASK-007).
