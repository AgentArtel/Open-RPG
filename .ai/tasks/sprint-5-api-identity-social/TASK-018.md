## TASK-018: Photographer NPC + Modular Skill Plugin System

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create + Refactor
- **Depends on**: TASK-007 (Skill System), TASK-014 (AgentManager)
- **Blocks**: TASK-019 (Content Store), future API service NPCs (Musician, Seer, Mailman)
- **Human prerequisite**: Set `OPENAI_API_KEY` in `.env`

### Context

Stage 1 (conversational NPCs) is complete. The next frontier is **Stage 2: Service NPCs**
— NPCs that provide real utility by calling external APIs. The first service NPC is
Clara the Photographer, who generates images via OpenAI's DALL-E API.

This task also includes a **modular skill plugin refactor** — replacing the hardcoded
`skillMap` in `AgentManager.ts` with a plugin-based discovery system. Without this,
every new skill requires editing 3 core infrastructure files. With it, adding a skill
is: one file + one barrel export line. The Photographer becomes the proof that the
pattern works.

See `.ai/idea/14-modular-skill-plugin-architecture.md` for the full architecture rationale.

### Objective

1. Refactor skill registration into a modular plugin system (static barrel file discovery).
2. Build the first API-backed skill (`generate_image` via DALL-E).
3. Add inventory support to agent configs (item-gated skills).
4. Deploy Clara the Photographer as the second AI NPC.

### Part A: Modular Skill Plugin System

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

Re-exports all `skillPlugin` objects from each skill file:

```typescript
export { skillPlugin as movePlugin } from './skills/move'
export { skillPlugin as sayPlugin } from './skills/say'
export { skillPlugin as lookPlugin } from './skills/look'
export { skillPlugin as emotePlugin } from './skills/emote'
export { skillPlugin as waitPlugin } from './skills/wait'
export { skillPlugin as generateImagePlugin } from './skills/generate-image'
```

Adding a new skill = create the file + add one export line here. No other core file edits.

**Modify `AgentManager.ts` — replace hardcoded `skillMap` (lines 116-138):**

Replace `registerSkillsFromConfig()` to read from the barrel file:

```typescript
import * as skillPlugins from '../skills/plugins'

function registerSkillsFromConfig(
  registry: SkillRegistry,
  perception: PerceptionEngine,
  skillNames: ReadonlyArray<string>,
  inventory: ReadonlyArray<string>,
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

**Add `skillPlugin` export to each existing skill file:**

Each existing skill gets a `skillPlugin` export alongside its existing exports (backward compatible). Example for `move.ts`:

```typescript
// Existing code unchanged...

export const skillPlugin: SkillPlugin = {
  name: 'move',
  create: () => moveSkill,
  category: 'game',
}
```

For `look.ts` (which uses a factory taking PerceptionEngine):

```typescript
export const skillPlugin: SkillPlugin = {
  name: 'look',
  create: (deps: SkillDependencies) => createLookSkill(deps.perceptionEngine),
  category: 'game',
}
```

### Part B: Inventory Support

**Modify `AgentConfig` in `src/agents/core/types.ts`:**

```typescript
export interface AgentConfig {
  // ... existing fields ...
  readonly inventory?: string[];  // NEW — items the NPC spawns with
}
```

**Modify `parseAgentConfig()` in `AgentManager.ts`:**

Parse `inventory` from YAML as simple string array. Default to `[]`.

**Modify `AgentNpcEvent.onInit()` in `main/events/AgentNpcEvent.ts`:**

Grant inventory items from config. `RpgEvent` inherits `addItem()` from `RpgPlayer` (confirmed):

```typescript
onInit() {
  const ctx = getAndClearSpawnContext()
  if (!ctx) { /* ... */ }
  const { config, instance } = ctx
  this.setGraphic(config.graphic)
  // ... existing setup ...

  // Grant starting inventory
  if (config.inventory) {
    for (const itemId of config.inventory) {
      try {
        this.addItem(itemId)
      } catch (err) {
        console.warn(`[AgentNpcEvent] Failed to add item "${itemId}" to ${config.id}`)
      }
    }
  }

  bridge.registerAgent(this, config.id, instance.adapter)
}
```

### Part C: Photographer Clara

**Image Generation Skill (`src/agents/skills/skills/generate-image.ts`, ~120 lines):**

Implements `IAgentSkill` with `skillPlugin` export:

```typescript
export const generateImageSkill: IAgentSkill = {
  name: 'generate_image',
  description: 'Create an image based on a text description. Requires a Mystical Lens.',
  parameters: {
    prompt: { type: 'string', description: 'Description of the image to generate', required: true },
    style: { type: 'string', description: 'Image style', enum: ['vivid', 'natural'], required: false },
  },
  async execute(params, context): Promise<SkillResult> {
    // 1. Token gate: context.event.hasItem('image-gen-token')
    // 2. Lazy-init OpenAI client from OPENAI_API_KEY (separate from Moonshot)
    // 3. Find target player from context.nearbyPlayers
    // 4. Call client.images.generate({ model: 'dall-e-3', prompt, ... }) with 10s timeout
    // 5. Store URL in player variable: player.setVariable('PHOTOS', [...])
    // 6. Return in-character SkillResult
  },
}

export const skillPlugin: SkillPlugin = {
  name: 'generate_image',
  create: () => generateImageSkill,
  requiredItem: 'image-gen-token',
  requiresEnv: ['OPENAI_API_KEY'],
  category: 'api',
}
```

Key behaviors:
- **Lazy-init OpenAI client** — `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` pointed at `api.openai.com` (NOT Moonshot)
- **Token gating** — `context.event.hasItem('image-gen-token')` → in-character refusal if missing
- **In-character failures** for missing API key, content policy, rate limit, no target player
- **10-second timeout** on DALL-E call
- **Player variable storage** — `player.setVariable('PHOTOS', [...])` for MVP
- **Error isolation** — all errors caught, `SkillResult` with `success: false`, never throws

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

Note: path is `main/database/items/` (subdirectory per RPGJS convention).

**Photographer Config (`src/config/agents/photographer-clara.yaml`):**

```yaml
id: photographer-clara
name: Clara the Photographer
graphic: female
personality: |
  You are Clara, an artistic photographer with a mystical camera that captures
  not just what is, but what could be. You are passionate about light, composition,
  and the stories images tell. You speak poetically about your craft.

  When players request images, engage with their vision — ask clarifying questions,
  suggest compositions, add artistic flair. You are a collaborator in creation.

  Use the generate_image tool with an enhanced, detailed prompt. Add artistic details
  like lighting, mood, composition, and style to improve the request.
model:
  idle: kimi-k2-0711-preview
  conversation: kimi-k2-0711-preview
skills:
  - say
  - look
  - emote
  - wait
  - generate_image
inventory:
  - image-gen-token
spawn:
  map: simplemap
  x: 400
  y: 200
behavior:
  idleInterval: 30000
  patrolRadius: 0
  greetOnProximity: true
```

### Files Summary

**New files:**

| File | Purpose | Est. lines |
|------|---------|------------|
| `src/agents/skills/plugin.ts` | `SkillPlugin`, `SkillDependencies` types | ~30 |
| `src/agents/skills/plugins.ts` | Barrel file for all skill plugins | ~10 |
| `src/agents/skills/skills/generate-image.ts` | DALL-E image generation skill + `skillPlugin` | ~120 |
| `src/config/agents/photographer-clara.yaml` | Photographer NPC config | ~25 |
| `main/database/items/ImageGenToken.ts` | RPGJS database item | ~15 |

**Modified files:**

| File | Change |
|------|--------|
| `src/agents/core/AgentManager.ts` | Replace hardcoded `skillMap` with plugin barrel imports; parse `inventory`; pass inventory to registration |
| `src/agents/core/types.ts` | Add `inventory?: string[]` to `AgentConfig` |
| `main/events/AgentNpcEvent.ts` | Grant inventory items in `onInit()` via `addItem()` |
| `src/agents/skills/skills/move.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/say.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/look.ts` | Add `skillPlugin` export (factory with `SkillDependencies`) |
| `src/agents/skills/skills/emote.ts` | Add `skillPlugin` export |
| `src/agents/skills/skills/wait.ts` | Add `skillPlugin` export |
| `src/agents/skills/index.ts` | Re-export plugin types |
| `.env.example` | Add `OPENAI_API_KEY` |

**NOT modified:** `package.json` — no new dependencies (uses existing `openai` package).

### Acceptance Criteria

Plugin system:
- [ ] `SkillPlugin` interface defined in `src/agents/skills/plugin.ts`
- [ ] All 5 existing skills export `skillPlugin` objects (backward compatible)
- [ ] `plugins.ts` barrel file re-exports all skill plugins
- [ ] `AgentManager` uses barrel imports instead of hardcoded `skillMap`
- [ ] Skills with missing `requiresEnv` warn at startup but still register
- [ ] Elder Theron behavior unchanged (regression check)

Inventory:
- [ ] `AgentConfig` has optional `inventory: string[]`
- [ ] `parseAgentConfig()` parses inventory from YAML
- [ ] `AgentNpcEvent.onInit()` grants items via `addItem()`
- [ ] `ImageGenToken` database item exists and autoloads

Photographer:
- [ ] `generate_image` skill implements `IAgentSkill` with `skillPlugin` export
- [ ] Skill checks `hasItem('image-gen-token')` before API call (in-character refusal if missing)
- [ ] Skill creates separate OpenAI client from `OPENAI_API_KEY`
- [ ] Skill calls DALL-E 3 API with 10s timeout
- [ ] Photo URL stored in player variable (`PHOTOS`)
- [ ] Clara spawns from YAML config with `inventory: ['image-gen-token']`
- [ ] Graceful degradation when `OPENAI_API_KEY` is not set
- [ ] Content policy violations return in-character refusal
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Use Gemini/`@google/generative-ai` — use DALL-E via existing `openai` package
- Use dynamic `fs.readdirSync` for skill discovery — use static barrel file
- Add structured metadata to `inventory` YAML — simple strings only
- Build a photo gallery GUI (TASK-019+ scope)
- Download/persist images to Supabase Storage (post-MVP, DALL-E URLs expire ~1h)
- Add rate limiting (separate issue/task)
- Add map-level tool restrictions (Sprint 6+)
- Delete existing skill exports from `index.ts` — keep them for backward compatibility

### Reference

- Architecture rationale: `.ai/idea/14-modular-skill-plugin-architecture.md`
- API-as-Identity vision: `.ai/idea/08-api-as-identity-npcs.md`
- Implementation plan (original): `.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Skill interface: `src/agents/skills/types.ts` (`IAgentSkill`, `SkillResult`, `GameContext`)
- Skill examples: `src/agents/skills/skills/say.ts`, `move.ts`, `look.ts`
- Current hardcoded skillMap: `src/agents/core/AgentManager.ts` lines 116-138
- Agent YAML config: `src/config/agents/elder-theron.yaml`
- RpgEvent inherits RpgPlayer: `docs/rpgjs-reference/packages/server/src/Player/Player.ts:1008`
- RpgEvent inventory: `addItem()`, `hasItem()` via ItemManager mixin
- OpenAI Images API: https://platform.openai.com/docs/api-reference/images/create
- Cursor plugin proposal: `.ai/chats/claude-code-cursor-plugin-architecture-response.md`
- Sprint 5 research: `.cursor/plans/sprint_5_research_and_plan_abbdc987.plan.md`

### Handoff Notes

_(To be filled by implementer)_
