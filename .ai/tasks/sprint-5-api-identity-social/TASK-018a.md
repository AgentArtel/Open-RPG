## TASK-018a: Modular Skill Plugin System

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills — Infrastructure)
- **Type**: Refactor + Create
- **Depends on**: TASK-007 (Skill System), TASK-014 (AgentManager)
- **Blocks**: TASK-018 (Photographer NPC), all future API-backed NPCs
- **Idea doc**: `.ai/idea/14-modular-skill-plugin-architecture.md`

### Context

The current `registerSkillsFromConfig()` in `AgentManager.ts` (lines 116-138) has a
hardcoded `skillMap`. Adding a new skill requires editing 3 core files: the skill map,
the barrel export, and the import graph. This won't scale as we add API-backed NPCs
(Photographer, Musician, Seer, Mailman, Scholar, etc.).

This task refactors skill registration into a **modular plugin system** using an
MCP-inspired mental model (Discovery, Scoping, Capability Negotiation) — without
literal MCP protocol overhead. After this task, adding a skill = one file + one barrel
export line. No other core edits.

This also adds **inventory support** to agent configs, enabling item-gated skill access
(the narrative pattern of "tools as physical objects").

### Objective

1. Define the `SkillPlugin` interface and `SkillDependencies` type.
2. Add `skillPlugin` exports to all 5 existing skills (backward compatible).
3. Create a static barrel file that re-exports all skill plugins.
4. Replace hardcoded `skillMap` in `AgentManager` with barrel-driven registration.
5. Add `inventory` support to `AgentConfig` + grant items at NPC spawn.
6. Create the `ImageGenToken` database item (used by TASK-018's Photographer).

### Specifications

**New types (`src/agents/skills/plugin.ts`, ~30 lines):**

```typescript
import type { IAgentSkill } from './types'
import type { PerceptionEngine } from '../perception/PerceptionEngine'

export interface SkillDependencies {
  perceptionEngine: PerceptionEngine;
}

export interface SkillPlugin {
  name: string;
  create: (() => IAgentSkill) | ((deps: SkillDependencies) => IAgentSkill);
  requiredItem?: string;           // Inventory item that grants access
  requiresEnv?: string[];          // Env vars needed (warn if missing, still register)
  category?: 'game' | 'api' | 'social' | 'knowledge';
}
```

**Static barrel file (`src/agents/skills/plugins.ts`):**

Re-exports all `skillPlugin` objects. Adding a new skill = add one line here.

```typescript
export { skillPlugin as movePlugin } from './skills/move'
export { skillPlugin as sayPlugin } from './skills/say'
export { skillPlugin as lookPlugin } from './skills/look'
export { skillPlugin as emotePlugin } from './skills/emote'
export { skillPlugin as waitPlugin } from './skills/wait'
// TASK-018 will add: export { skillPlugin as generateImagePlugin } from './skills/generate-image'
```

**Why static barrel, not dynamic `fs.readdirSync`:**
- TypeScript type safety preserved
- Vite/RPGJS build system compatibility (dynamic require can break bundling)
- Explicit is better than magical for 10-15 skills
- Easy to migrate to dynamic later if needed

**Modify `AgentManager.ts` — replace hardcoded `skillMap` (lines 116-138):**

```typescript
import * as skillPlugins from '../skills/plugins'

function registerSkillsFromConfig(
  registry: SkillRegistry,
  perception: PerceptionEngine,
  skillNames: ReadonlyArray<string>,
): void {
  const deps: SkillDependencies = { perceptionEngine: perception }

  for (const plugin of Object.values(skillPlugins)) {
    if (!skillNames.includes(plugin.name)) continue

    // Warn if env vars missing but still register (in-character failure at execution)
    if (plugin.requiresEnv) {
      const missing = plugin.requiresEnv.filter(v => !process.env[v])
      if (missing.length > 0) {
        console.warn(`[AgentManager] Skill "${plugin.name}" missing env: ${missing.join(', ')}`)
      }
    }

    const skill = typeof plugin.create === 'function' && plugin.create.length > 0
      ? (plugin.create as (deps: SkillDependencies) => IAgentSkill)(deps)
      : (plugin.create as () => IAgentSkill)()
    registry.register(skill)
  }
}
```

**Add `skillPlugin` export to each existing skill file (backward compatible):**

Example for `move.ts`:
```typescript
import type { SkillPlugin } from '../plugin'

// ... existing moveSkill code unchanged ...

export const skillPlugin: SkillPlugin = {
  name: 'move',
  create: () => moveSkill,
  category: 'game',
}
```

For `look.ts` (factory pattern with PerceptionEngine):
```typescript
export const skillPlugin: SkillPlugin = {
  name: 'look',
  create: (deps: SkillDependencies) => createLookSkill(deps.perceptionEngine),
  category: 'game',
}
```

**Inventory support in `AgentConfig` (`src/agents/core/types.ts`):**

```typescript
export interface AgentConfig {
  // ... existing fields ...
  readonly inventory?: string[];  // Items the NPC spawns with
}
```

**Parse inventory in `AgentManager.parseAgentConfig()`:**

Add `inventory` parsing from YAML. Default to `[]`.

**Grant inventory in `AgentNpcEvent.onInit()` (`main/events/AgentNpcEvent.ts`):**

`RpgEvent` inherits `addItem()` from `RpgPlayer` (confirmed in RPGJS v4 source):

```typescript
// After existing setup, before bridge.registerAgent()
if (config.inventory) {
  for (const itemId of config.inventory) {
    try {
      this.addItem(itemId)
    } catch (err) {
      console.warn(`[AgentNpcEvent] Failed to add item "${itemId}" to ${config.id}`)
    }
  }
}
```

**Token Database Item (`main/database/items/ImageGenToken.ts`):**

```typescript
import { Item } from '@rpgjs/database'

@Item({
  id: 'image-gen-token',
  name: 'Mystical Lens',
  description: 'A shimmering lens that allows the bearer to capture visions.',
  price: 0,
  consumable: false,
})
export default class ImageGenToken {}
```

Path is `main/database/items/` (subdirectory per RPGJS v4 autoload convention).

### Files Summary

**New files:**

| File | Purpose | Est. lines |
|------|---------|------------|
| `src/agents/skills/plugin.ts` | `SkillPlugin`, `SkillDependencies` types | ~30 |
| `src/agents/skills/plugins.ts` | Barrel file re-exporting all skill plugins | ~10 |
| `main/database/items/ImageGenToken.ts` | RPGJS database item for token gating | ~15 |

**Modified files:**

| File | Change |
|------|--------|
| `src/agents/core/AgentManager.ts` | Replace hardcoded `skillMap` with barrel-driven registration; parse `inventory` from YAML |
| `src/agents/core/types.ts` | Add `inventory?: string[]` to `AgentConfig` |
| `main/events/AgentNpcEvent.ts` | Grant inventory items in `onInit()` via `addItem()` |
| `src/agents/skills/skills/move.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/say.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/look.ts` | Add `skillPlugin` export (factory with `SkillDependencies`) |
| `src/agents/skills/skills/emote.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/wait.ts` | Add `skillPlugin` export |
| `src/agents/skills/index.ts` | Re-export plugin types |

### Acceptance Criteria

- [ ] `SkillPlugin` interface defined with `name`, `create`, `requiredItem`, `requiresEnv`, `category`
- [ ] `SkillDependencies` interface defined with `perceptionEngine`
- [ ] All 5 existing skills export `skillPlugin` objects (backward compatible — existing exports unchanged)
- [ ] `plugins.ts` barrel file re-exports all 5 skill plugins
- [ ] `AgentManager.registerSkillsFromConfig()` uses barrel imports (no hardcoded `skillMap`)
- [ ] Skills with missing `requiresEnv` warn at startup but still register
- [ ] `AgentConfig` has optional `inventory: string[]`
- [ ] `parseAgentConfig()` parses `inventory` from YAML
- [ ] `AgentNpcEvent.onInit()` grants items via `addItem()` for each inventory entry
- [ ] `ImageGenToken` database item exists and autoloads
- [ ] Elder Theron behavior unchanged (regression check — no inventory, same 5 skills)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Use dynamic `fs.readdirSync` for skill discovery — use static barrel file
- Add structured metadata to `inventory` YAML — simple strings only
- Add map-level skill restrictions (`availableOnMaps`) — deferred to Sprint 6+
- Add rate limiting or budget management — deferred to Sprint 6+
- Delete existing skill exports from `index.ts` — keep them for backward compatibility
- Add `generate_image` skill (that's TASK-018)
- Add any new npm dependencies (existing packages are sufficient)

### Reference

- Architecture rationale: `.ai/idea/14-modular-skill-plugin-architecture.md`
- Architecture brief (full): `.ai/briefs/modular-skill-plugin-architecture.md`
- Current hardcoded skillMap: `src/agents/core/AgentManager.ts` lines 116-138
- Skill interface: `src/agents/skills/types.ts` (`IAgentSkill`, `SkillResult`, `GameContext`)
- Skill examples: `src/agents/skills/skills/move.ts`, `say.ts`, `look.ts`
- Agent YAML config: `src/config/agents/elder-theron.yaml`
- RpgEvent inherits RpgPlayer: `docs/rpgjs-reference/packages/server/src/Player/Player.ts:1008`
- RpgEvent inventory: `addItem()`, `hasItem()` via ItemManager mixin
- Orchestrator decisions: `.ai/chats/claude-code-cursor-plugin-architecture-response.md`

### Handoff Notes

_(To be filled by implementer)_
