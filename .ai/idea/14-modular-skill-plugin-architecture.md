# Idea 14: Modular Skill Plugin Architecture

**Origin**: Cursor (implementation research for TASK-018)
**Date**: 2026-02-14
**Status**: APPROVED — building as part of TASK-018

---

## Problem

The current `registerSkillsFromConfig()` in `AgentManager.ts` has a hardcoded skill map:

```typescript
const skillMap = {
  move: moveSkill,
  say: saySkill,
  look: createLookSkill,
  emote: emoteSkill,
  wait: waitSkill,
}
```

Adding a new skill requires editing **3 core files**: `AgentManager.ts`, `src/agents/skills/index.ts`, and the import graph. This violates the project's YAML-driven declarative model and becomes a maintenance burden as API-backed NPCs scale (Photographer, Musician, Seer, Mailman, Scholar, etc.).

## Solution: Three-Layer Architecture

### Layer 1: Discovery — Skill Plugin Auto-Registration

Skills become self-registering plugins via a `SkillPlugin` interface:

```typescript
interface SkillPlugin {
  name: string;
  create: (() => IAgentSkill) | ((deps: SkillDependencies) => IAgentSkill);
  requiredItem?: string;           // Inventory item that grants access
  requiresEnv?: string[];          // Env vars needed (warn if missing, still register)
  category?: 'game' | 'api' | 'social' | 'knowledge';
}
```

Each skill file exports a `skillPlugin` object alongside its existing exports. A **static barrel file** (`src/agents/skills/plugins.ts`) re-exports all plugins. `AgentManager` iterates the barrel instead of maintaining a hardcoded map.

**Adding a new skill = create file + add one barrel export line. No other core edits.**

**Why static barrel, not dynamic `fs.readdirSync`:**
- TypeScript type safety preserved
- Vite/RPGJS build system compatibility (dynamic require breaks bundling)
- Explicit is better than magical for 10-15 skills
- Easy to migrate to dynamic later if needed

### Layer 2: Scoping — Item-Gated Skill Access

API-backed skills are gated by inventory items. The NPC must possess the item to use the skill. This creates the narrative of "tools as physical objects" — the Photographer's Mystical Lens, the Musician's Enchanted Lute.

Available tools for an NPC at runtime:
```
(skills in YAML config)
∩ (skills with satisfied item requirements OR no item requirement)
∩ (skills with satisfied env requirements OR no env requirement)
```

The skill is **always registered** (visible to the LLM), but execution checks the item gate. If the item is missing, the LLM gets an in-character failure and can reason about it: "I seem to have lost my camera, have you seen it?"

Agent YAML gets an `inventory` field (simple strings):
```yaml
skills: [say, look, emote, wait, generate_image]
inventory: [image-gen-token]
```

`RpgEvent` inherits `addItem()`/`hasItem()` from `RpgPlayer` (confirmed in RPGJS v4 source). Items granted in `AgentNpcEvent.onInit()`.

### Layer 3: Capability Negotiation — In-Character Failures

When a skill can't execute, it returns an in-character failure message:

| Failure | Response |
|---------|----------|
| Missing API key | "The lens is clouded today... the creative energy doesn't flow here." |
| Missing item | "I need my mystical camera for that, but I seem to have misplaced it." |
| Rate limit | "I need to rest my eyes. Perhaps try again later." |
| Content policy | "My lens refuses to capture that vision. Perhaps something more appropriate?" |
| Map restriction | "Something about this place... I can't focus my craft here." |

The LLM receives these as `SkillResult { success: false }` and incorporates them into its response naturally.

## MCP Mental Model (Not Literal MCP)

The architecture draws conceptual inspiration from the Model Context Protocol:

| MCP Concept | Our Adaptation |
|-------------|----------------|
| Server announces tools | Skill plugins self-declare via `SkillPlugin` export |
| Client discovers tools | `AgentManager` reads barrel file at startup |
| Client filters by capability | AgentRunner intersects config + inventory + env |
| Capability negotiation | In-character failure messages |
| JSON-RPC transport | Not needed — everything runs in-process |

We extract three ideas (Discovery, Scoping, Capability Negotiation) without MCP's overhead. Everything runs in a single Node.js process with direct function calls.

## Narrative Connection

**"Identity through action"** — An NPC's identity IS its capabilities. Clara is a photographer because she has a Mystical Lens that grants `generate_image`. Remove the lens, and she can still talk and emote, but she's no longer a photographer. Identity is assembled from equipped capabilities.

**"Commands-as-Knowledge"** — NPCs start with `[move, say, look, emote, wait]`. Through gameplay, they acquire items that unlock new skills. The plugin system makes this literal and runtime-modifiable.

## Build Now vs. Later

### Now (TASK-018)
- `SkillPlugin` interface + `SkillDependencies`
- Static barrel file (`plugins.ts`)
- `AgentManager` reads barrel instead of hardcoded map
- `skillPlugin` exports on all 5 existing skills
- `generate_image` skill (DALL-E) as first API skill
- `AgentConfig.inventory` + item granting in `onInit()`
- `ImageGenToken` database item

### Later
- **Map-level tool context** (Sprint 6+) — which APIs are available per map
- **Builder UI skill selection** (Sprint 6+) — toggle skills per NPC in dashboard
- **Budget/rate limiting** (Sprint 6+) — per-player and per-NPC API call limits
- **Dynamic item trading** (Sprint 7+) — players give items to NPCs at runtime

## Impact

- **Immediate**: TASK-018 proves the pattern with Clara
- **TASK-019+**: `create_post` skill is one file + one barrel line
- **Future NPCs**: Musician, Seer, Mailman each = one skill file + one YAML config + one DB item
- **No refactor needed later**: the architecture scales from 6 to 50+ skills

## References

- Cursor's full proposal: `.ai/chats/claude-code-cursor-plugin-architecture-response.md`
- Orchestrator decisions: `.ai/chats/claude-code-cursor-plugin-architecture-response.md`
- API-as-Identity vision: `.ai/idea/08-api-as-identity-npcs.md`
- Current hardcoded skillMap: `src/agents/core/AgentManager.ts` lines 116-138
- TASK-018 brief (updated): `.ai/tasks/sprint-5-api-identity-social/TASK-018.md`
