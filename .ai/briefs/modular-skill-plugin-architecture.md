# Architecture Brief: Modular Skill Plugin System

**From**: Cursor (Implementation Specialist)
**To**: Claude Code (Orchestrator)
**Date**: 2026-02-14
**Context**: Pre-implementation research for TASK-018 (Photographer NPC)
**Status**: PROPOSAL — Requesting architectural review and sprint integration

---

## Summary

While planning the Photographer NPC (TASK-018), we identified that the current
skill registration system is hardcoded and won't scale. Before building the
second AI NPC, we propose refactoring skill registration into a **modular plugin
system** — making every future API-backed NPC a configuration-only task (no core
code changes). This brief describes the full vision, its MCP-inspired mental
model, what to build now vs. later, and the exact code that needs to change.

---

## The Problem

The current `registerSkillsFromConfig()` in `AgentManager.ts` (lines 116–138)
has a **hardcoded skill map**:

```typescript
const skillMap: Record<string, IAgentSkill | ((pe: PerceptionEngine) => IAgentSkill)> = {
  move: moveSkill,
  say: saySkill,
  look: createLookSkill,
  emote: emoteSkill,
  wait: waitSkill,
}
```

Adding a new skill (like `generate_image`) requires:
1. Write the skill file ✓ (already modular)
2. Export it from `src/agents/skills/index.ts` (manual)
3. Import it in `AgentManager.ts` (manual)
4. Add it to the `skillMap` dictionary (manual)
5. Add the skill name to an NPC's YAML config ✓ (already modular)

Steps 2–4 mean **every new skill requires editing core infrastructure files**.
This violates the project's goal of declarative, YAML-driven agent configuration.
When we hit 10+ API-backed NPCs (Photographer, Musician, Seer, Mailman, Scholar,
etc.), this approach becomes a maintenance burden and a merge-conflict magnet.

---

## The Proposed Solution: Three-Layer Modular Skill Architecture

We're using **MCP (Model Context Protocol) as a mental model** — not as a literal
implementation. MCP defines how LLM clients discover and use tools from external
servers. Our system adapts three MCP concepts for game NPCs:

### Mental Model: How MCP Maps to Our World

| MCP Concept | Our Adaptation | What It Means |
|---|---|---|
| **Server** announces tools | **Map config** declares available API skills | Each map defines what API endpoints are reachable |
| **Client** discovers tools | **AgentManager** auto-discovers skill plugins | Skill files self-register, no hardcoded map needed |
| **Client** filters by capability | **AgentRunner** intersects map + inventory + config | NPCs only see tools they know, have items for, and map supports |
| **Capability negotiation** | **In-character failure messages** | "My lens is clouded today..." instead of error codes |
| **JSON-RPC transport** | **Direct function calls** (not needed) | Everything runs in-process, no protocol overhead |

### Why MCP-Inspired, Not Literal MCP

We extract three concepts (Discovery, Scoping, Capability Negotiation) but avoid
MCP's overhead because:
- Everything runs in a single Node.js process — no need for JSON-RPC transport
- Our `IAgentSkill` interface already does what MCP tool definitions do
- `SkillRegistry.getToolDefinitions()` already converts to OpenAI function-calling format
- We need **runtime dynamism** (item acquisition changes capabilities) which MCP doesn't model
- We need **narrative integration** (failures are in-character) which MCP doesn't support

### The Three Layers

#### Layer 1: Discovery — Skill Plugin Auto-Registration

Skills become self-registering plugins. Instead of a hardcoded `skillMap`, the
system scans a directory and each skill file exports a standard registration
object:

```typescript
// src/agents/skills/skills/generate-image.ts
export const skillPlugin: SkillPlugin = {
  name: 'generate_image',
  create: () => generateImageSkill,       // or factory: (deps) => createSkill(deps)
  requiredItem: 'image-gen-token',        // optional: item that grants this skill
  requiresEnv: ['GEMINI_API_KEY'],        // optional: env vars needed
  category: 'api',                        // grouping for builder UI
};
```

The `SkillPlugin` interface:

```typescript
interface SkillPlugin {
  name: string;
  create: (() => IAgentSkill) | ((deps: SkillDependencies) => IAgentSkill);
  requiredItem?: string;           // inventory item that grants access
  requiresEnv?: string[];          // env vars needed (checked at registration)
  availableOnMaps?: string[];      // optional map-level restriction
  category?: 'game' | 'api' | 'social' | 'knowledge';  // for builder UI grouping
}

interface SkillDependencies {
  perceptionEngine: PerceptionEngine;
  // future: rateLimiter, budgetManager, etc.
}
```

**Registration flow**: At startup, `AgentManager.loadConfigs()` also calls a new
`discoverSkills()` function that:
1. Reads all `.ts` files in `src/agents/skills/skills/`
2. Checks for a `skillPlugin` export
3. Validates `requiresEnv` (warns if missing, still registers the skill)
4. Builds the global `skillMap` automatically
5. Skills not exporting `skillPlugin` are treated as legacy (direct import, backward compatible)

**Result**: Adding a new skill = drop a file with a `skillPlugin` export. No
edits to `AgentManager.ts`, no edits to `index.ts`, no edits to any core file.

#### Layer 2: Scoping — Item-Gated Skill Access

API-backed skills are gated by inventory items. The NPC must possess the item to
use the skill. This creates the narrative of "tools as physical objects" —
the Photographer's Mystical Camera, the Musician's Enchanted Lute, the Seer's
Crystal Ball.

**How it works at runtime**:

```
Available Tools for NPC = 
  (skills listed in YAML config)
  ∩ (skills with satisfied item requirements OR no item requirement)
  ∩ (skills with satisfied env requirements OR no env requirement)
```

The check happens at **two levels**:
1. **Registration time**: `registerSkillsFromConfig()` filters by YAML `skills` list (exists today)
2. **Execution time**: The skill's `execute()` method checks `context.event.hasItem(requiredItem)` (new)

This is intentionally redundant (defense in depth). The LLM sees the tool
definition even if the item is missing — but execution returns an in-character
failure message. This lets the LLM *reason about* the missing item ("I seem to
have lost my camera, have you seen it?") rather than being silently blocked.

**YAML config extension** for inventory:

```yaml
# Current schema
skills:
  - say
  - look
  - emote
  - wait
  - generate_image

# New: starting inventory (items the NPC spawns with)
inventory:
  - image-gen-token    # Grants access to generate_image
```

The `AgentConfig` type adds an optional `inventory` field. `AgentManager` gives
the NPC these items at spawn time via `npcEvent.addItem()`.

#### Layer 3: Capability Negotiation — In-Character Failures

When a skill can't execute, it returns an **in-character failure message** that
feeds back into the LLM's reasoning loop. This is where we improve on MCP —
instead of error codes, we get narrative:

| Failure Reason | MCP Would Return | We Return |
|---|---|---|
| Missing API key | `{"error": "api_unavailable"}` | "The lens is clouded today... the creative energy doesn't flow here." |
| Missing item | `{"error": "unauthorized"}` | "I need my mystical camera for that, but I seem to have misplaced it." |
| Rate limit hit | `{"error": "rate_limited"}` | "I need to rest my eyes. This lens exhausts me. Perhaps try again later." |
| Content policy | `{"error": "content_blocked"}` | "My lens refuses to capture that vision. Perhaps something more... appropriate?" |
| Map restriction | `{"error": "not_available"}` | "Something about this place... I can't focus my craft here." |

The LLM receives these as `SkillResult` with `success: false` and can
incorporate them into its response naturally. The player never sees raw error
codes — they see an NPC reacting in character.

---

## Connection to Artel's Arcanum Narrative

This architecture directly implements three core narrative principles from the
game canon:

### "Identity is formed through chosen actions, not inherited labels"

An NPC's identity IS its capabilities. A Photographer isn't labeled "photographer"
in some database — it's a photographer because it has a Mystical Camera (item)
that grants `generate_image` (skill) backed by Gemini (API). Remove the camera,
and the NPC can still talk, look, emote, and wait — but it's no longer a
photographer. The identity is literally assembled from equipped capabilities.

### "Commands-as-Knowledge" progression

NPCs start with `[move, say, look, emote, wait]` — the "bare vocabulary of
existence." Through gameplay events, they acquire items that unlock new skills.
Complete the fighter's guild quest → receive a Warrior's Blade → unlocks `attack`.
Apprentice with the blacksmith → receive a Craftsman's Hammer → unlocks `craft`.
The skill plugin system makes this progression literal and runtime-modifiable.

### "The Arcanum as aggregate state"

The Arcanum is described as "the aggregate state across player variables, agent
memories, map state, and the skill registries of every active agent." The modular
skill system makes each NPC's `SkillRegistry` a visible, queryable part of the
Arcanum. What can Clara do? Check her registry. What changed? She acquired a new
item. The skill system IS the capability ledger.

---

## What to Build Now (With TASK-018)

These changes are minimal, proven by the Photographer use case, and don't break
existing Elder Theron behavior:

### 1. Skill Plugin Interface + Auto-Discovery

- **New file**: `src/agents/skills/plugin.ts` — defines `SkillPlugin` and `SkillDependencies` types
- **New function**: `discoverSkillPlugins()` in `src/agents/skills/discovery.ts` — scans skill directory, builds plugin map
- **Modify**: `AgentManager.ts` lines 116-138 — replace hardcoded `skillMap` with auto-discovered plugins
- **Modify**: Existing skills (`move.ts`, `say.ts`, etc.) — add `skillPlugin` export alongside existing exports (backward compatible)

**Estimated change**: ~100 lines new code, ~30 lines modified

### 2. The `generate_image` Skill

- **New file**: `src/agents/skills/skills/generate-image.ts` — as designed in `08a`, with `skillPlugin` export
- **New dependency**: `@google/generative-ai` (Gemini SDK)

**Estimated change**: ~120 lines (already designed in idea doc `08a`)

### 3. Inventory Support in Agent Config

- **Modify**: `AgentConfig` type in `src/agents/core/types.ts` — add optional `inventory: string[]`
- **Modify**: `parseAgentConfig()` in `AgentManager.ts` — parse `inventory` from YAML
- **Modify**: `spawnAgentsOnMap()` in `AgentManager.ts` — call `npcEvent.addItem()` for each inventory item
- **New file**: `main/database/items/ImageGenToken.ts` — RPGJS database item

**Estimated change**: ~30 lines modified, ~15 lines new

### 4. Photographer Clara YAML Config

- **New file**: `src/config/agents/photographer-clara.yaml` — as designed in TASK-018

**Estimated change**: ~25 lines YAML

### Total Scope

~300 lines of new/modified code. Existing Elder Theron behavior is unchanged.
The auto-discovery system replaces the hardcoded skill map transparently.

---

## What to Build Later (Design Now, Implement in Future Sprints)

### Map-Level Tool Context (Sprint 6+)

Map configs that define available API endpoints and budgets:

```yaml
# src/config/maps/artisans-quarter.yaml
id: artisans-quarter
available_skills:
  - generate_image
  - generate_music
api_budget:
  gemini_calls_per_day: 50
  suno_calls_per_day: 20
```

**Why defer**: We only have one map (`simplemap`) currently. Map-level scoping
adds value when we have multiple maps with different API contexts.

### Builder UI Enhancement (Sprint 6+)

Extend the existing builder dashboard (`main/gui/builder-dashboard.vue`) to:
- Show available skill plugins (auto-discovered), grouped by category
- Let users toggle which skills an NPC has
- Assign inventory items that grant API skills
- Pick AI model tier (idle vs. conversation)
- Save as new YAML config

**Why defer**: The builder works for placement today. Skill selection UI requires
the plugin discovery system to be stable first.

### Budget/Rate Limiting (Sprint 6+)

Per-player and per-NPC rate limits:

```typescript
const RATE_LIMITS = {
  generate_image: { perPlayer: 10, perNpc: 50, windowMs: 3600000 },
}
```

**Why defer**: Critical for production, not needed for proof-of-concept. Can be
added as a middleware layer in the skill execution pipeline.

### Dynamic Item Trading (Sprint 7+)

Players giving items to NPCs (and vice versa) to change their capabilities at
runtime. A player could give their Mystical Camera to a different NPC, making
THAT NPC the photographer.

**Why defer**: Requires full RPGJS inventory interop between players and events,
plus persistence of NPC inventory state.

---

## Affected Files Summary

### New Files (Cursor's domain)
| File | Purpose |
|---|---|
| `src/agents/skills/plugin.ts` | `SkillPlugin` type definition |
| `src/agents/skills/discovery.ts` | `discoverSkillPlugins()` auto-registration |
| `src/agents/skills/skills/generate-image.ts` | Image generation skill (Gemini API) |
| `src/config/agents/photographer-clara.yaml` | Photographer NPC config |
| `main/database/items/ImageGenToken.ts` | RPGJS database item for token gating |

### Modified Files (Cursor's domain)
| File | Change |
|---|---|
| `src/agents/core/AgentManager.ts` | Replace hardcoded `skillMap` with plugin discovery; add inventory support at spawn |
| `src/agents/core/types.ts` | Add optional `inventory` field to `AgentConfig` |
| `src/agents/skills/skills/move.ts` | Add `skillPlugin` export (backward compatible) |
| `src/agents/skills/skills/say.ts` | Add `skillPlugin` export (backward compatible) |
| `src/agents/skills/skills/look.ts` | Add `skillPlugin` export (backward compatible) |
| `src/agents/skills/skills/emote.ts` | Add `skillPlugin` export (backward compatible) |
| `src/agents/skills/skills/wait.ts` | Add `skillPlugin` export (backward compatible) |
| `src/agents/skills/index.ts` | Re-export plugin types |
| `.env.example` | Add `GEMINI_API_KEY` |

### Files NOT Modified (Claude Code's domain — no boundary violations)
- `AGENTS.md`, `CLAUDE.md`, `.ai/` docs (orchestrator updates these)
- `package.json`, `tsconfig.json` (orchestrator approval for new dependency)
- `docs/`, `idea/` (orchestrator-owned documentation)

---

## Dependency Addition

**New npm dependency**: `@google/generative-ai`
- Required for Gemini image generation API
- Separate from the Moonshot/Kimi LLM client (which uses `openai` SDK)
- This is the official Google SDK for Gemini
- Used only by `generate-image.ts` — isolated, not a core dependency

**Needs orchestrator approval** per project conventions (AGENTS.md: "Add
dependencies without documenting why" is a Don't).

---

## Questions for Orchestrator

1. **Should TASK-018 be split?** The skill plugin refactor could be a separate
   task (TASK-018a: Modular Skill Plugin System) with TASK-018b being the
   Photographer implementation that uses it. Or keep as one task since they're
   tightly coupled.

2. **`AgentConfig.inventory` schema**: Should inventory items be simple strings
   (`inventory: ['image-gen-token']`) or structured objects with metadata
   (`inventory: [{ item: 'image-gen-token', grants_skill: 'generate_image' }]`)?
   Simple strings are enough for MVP; the binding between item and skill lives
   in the `SkillPlugin` definition.

3. **Auto-discovery mechanism**: Static imports via barrel file, or dynamic
   `fs.readdirSync` + `require()`? Static is cleaner for TypeScript but requires
   updating the barrel file. Dynamic is truly zero-config but needs careful
   error handling. Recommendation: start with enhanced barrel file (auto-export
   all `skillPlugin` objects), migrate to dynamic discovery later if needed.

4. **Idea docs update**: Should `08-api-as-identity-npcs.md` and
   `08a-api-powered-skills-implementation-plan.md` be updated to reflect the
   modular plugin architecture, or should this be a new idea doc (e.g.,
   `14-modular-skill-plugin-architecture.md`)?

5. **Sprint 5 scope**: Does adding the plugin refactor to Sprint 5 change the
   timeline for TASK-019/020/021? The refactor is estimated at ~1 session of
   work and reduces implementation time for all subsequent API NPCs.

---

## References

| Document | Relevance |
|---|---|
| `.ai/idea/08-api-as-identity-npcs.md` | API-as-Identity vision, token economy, four-stage progression |
| `.ai/idea/08a-api-powered-skills-implementation-plan.md` | Gemini skill implementation design, step-by-step plan |
| `.ai/idea/13-complete-system-narrative.md` | Full system architecture narrative |
| `src/agents/core/AgentManager.ts` lines 116-138 | Current hardcoded `registerSkillsFromConfig()` |
| `src/agents/skills/types.ts` | `IAgentSkill`, `SkillResult`, `GameContext` interfaces |
| `src/agents/core/types.ts` lines 109-139 | Current `AgentConfig` type definition |
| `src/config/agents/elder-theron.yaml` | Reference NPC config (current pattern) |
| `.ai/tasks/sprint-5-api-identity-social/TASK-018.md` | Current Photographer task brief |
| Artel's Arcanum Narrative Canon (user-provided) | Game narrative: identity through action, commands-as-knowledge |

---

## MCP Research Sources

The MCP mental model draws from:

- **Model Context Protocol specification**: Tool discovery, capability negotiation,
  and server/client architecture patterns. We adopt the conceptual model (servers
  announce tools, clients filter by capability) without the protocol overhead
  (JSON-RPC, transport layer, external processes).

- **Capability-based security pattern**: The principle that access is controlled by
  possession of unforgeable tokens (capabilities), not by identity checks against
  an access control list. In our system, inventory items ARE capabilities.

- **OpenClaw skill system** (`docs/openclaw-reference/src/agents/pi-tools.ts`):
  The extracted pattern of skills as structured tool definitions with validation
  and error handling. We extend this with the plugin registration layer.

---

## Recommendation

Build the modular skill plugin system **now**, as part of TASK-018. The cost is
~100 extra lines of infrastructure code. The payoff is that every subsequent
API NPC (Musician, Seer, Mailman, Scholar) becomes a zero-core-code-change
addition: one skill file + one YAML config + one database item. This aligns
with the narrative canon ("identity formed through chosen actions"), the
existing architecture (YAML-driven configs, `IAgentSkill` interface), and the
product roadmap (Stage 4: Multi-API Ecosystem).

The alternative — building the Photographer with the hardcoded pattern and
refactoring later — creates technical debt on the critical path to the multi-NPC
ecosystem. Better to pay the small cost now while the skill count is 6 (5
existing + 1 new) than to refactor when it's 15+.
