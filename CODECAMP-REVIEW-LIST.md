# Codecamp-Artel-MMORPG → Open-RPG: Full Review List

**Purpose:** Catalog every notable pattern/implementation from the old Codecamp project that could inform our open-rpg architecture (game + Studio + Supabase).

**Repo:** https://github.com/AgentArtel/Codecamp-Artel-MMORPG  
**Date:** 2026-02-14

---

## Priority Legend

- **HIGH** — Directly applicable to current or next-sprint work
- **MEDIUM** — Useful pattern, worth adapting when relevant feature is scoped
- **LOW** — Nice-to-have; file for future reference

---

## 1. AI Control Bridge (HTTP Intent System) — HIGH

**File:** `ai-control/server.ts`

**What it does:** Exposes two HTTP endpoints: `POST /ai-control/intent` (execute batched commands on game entities) and `GET /ai-control/world-state` (read entity/map state). Supports 6 intent types (`move`, `teleport`, `say`, `emit`, `play_sound`, `set_variable`). Includes API key auth, payload validation, partial-success results, and a Socket.IO telemetry namespace (`/ai-telemetry`).

**Why it matters:** This is an **external AI control surface** — any external process can read game state and issue commands via HTTP. Currently our agents run in-process; this pattern enables a **hybrid architecture** where Studio workflows, external AI orchestrators, or debugging tools can also drive NPC behavior via REST.

**How to model it:**
- A `game-control` Supabase Edge Function (or Express route) that accepts intents from Studio
- Studio's workflow builder could use this to test NPC skills without a running game client
- The telemetry namespace could power Studio's real-time dashboard

---

## 2. Database-Driven NPC Spawning (Persistence) — HIGH

**File:** `main/utils/persistence.ts`

**What it does:** Queries Supabase for entities where `spawned=true` and `entity_type=ai-npc`, spawns them as dynamic events with retry logic (exponential backoff: 1s, 3s), collision detection (checks if entity already exists), spawn-point resolution from Tiled map objects or metadata position, and error feedback back to the database (`updateSpawnError` patches `spawned=false` with error message).

**Why it matters:** Our `AgentManager.spawnAgentsOnMap()` reads from Supabase `game.agent_configs` but doesn't have retry logic, spawn dedup, or error reporting back to the DB. This is critical for production reliability.

**How to model it:**
- Add retry with backoff to `AgentManager` spawning
- Write spawn errors back to `game.agent_configs` (e.g. `spawn_error` column) so Studio can surface them
- Check for existing events before spawning duplicates

---

## 3. TMX-to-Database Entity Sync — HIGH

**File:** `main/utils/entitySync.ts`

**What it does:** Parses Tiled TMX map files using `fast-xml-parser`, extracts all named objects with positions and custom properties (`entityType`, `role`, `tools`, `areaId`, `aiEnabled`), normalizes them, and bulk-syncs to a Supabase Edge Function. Uses the world file to discover all maps.

**Why it matters:** Currently our NPC spawn locations are defined in YAML or the database — **not in the Tiled map editor**. This creates a disconnect: level designers place objects in Tiled, but those placements don't flow to the database. Syncing Tiled → Supabase makes the map editor the source of truth for entity placement while the database adds runtime state.

**How to model it:**
- Build a `tiled-sync` script (or Edge Function) that reads our TMX files, extracts NPC spawn points, and writes/updates `game.agent_configs.spawn_map` and `spawn_x/y`
- Studio could then show NPC placements as read from the map, with overrides allowed

---

## 4. Generic NPC Event (Single Class for All DB NPCs) — HIGH

**File:** `main/events/GenericNPCEvent.ts`

**What it does:** A single reusable event class that reads configuration from RPGJS variables (`sprite`, `displayName`, `entityId`) set at spawn time. Supports **recursive multi-turn conversation** via `handleDialogueInteraction()` with `conversationId` + branching dialogue options from backend `dialogueOptions[]`.

**Why it matters:** Our `AgentNpcEvent.ts` already does this via YAML config + bridge, but the **recursive multi-turn dialogue with choices** is a pattern we haven't implemented. The Codecamp version can present dynamic dialogue options from the backend, let the player choose, and loop back with context.

**How to model it:**
- After the LLM responds, if the response includes `dialogueOptions`, present them via `player.showChoices()` and feed the selection back into the next agent turn
- This would replace the current hardcoded Yes/No choice for the photographer with dynamic LLM-driven choices for any NPC

---

## 5. Socket-Based Identity Bridge (External Auth → RPGJS) — HIGH

**File:** `main/server.ts` + `main/utils/gameState.ts` + `main/client.ts`

**What it does:** A three-part auth bridge:
1. **Client:** Listens for `SET_PLAYER_IDENTITY` postMessage from parent (Lovable frontend), stores authenticated user ID in `GameState`
2. **Client → Server:** Emits `set-player-identity` socket event with `{ userId, username }`
3. **Server:** Finds RPGJS player by socket ID, stores auth via `player.setVariable('authenticatedPlayerId', userId)`

Includes a deferred mapping (stores identity in a `Map` for cases where identity arrives before the player object is created).

**Why it matters:** We need this exact pattern for our Studio ↔ Game integration. When a player authenticates via Supabase Auth in the Lovable frontend, we need to bridge that identity into RPGJS so agent memory, photo history, etc. are tied to persistent user accounts — not ephemeral session IDs.

**How to model it:**
- Implement the same `SET_PLAYER_IDENTITY` → socket → `player.setVariable()` flow
- Use the authenticated ID when writing to `game.agent_memory` and `game.player_state`
- The deferred-mapping pattern handles the race condition gracefully

---

## 6. Photographer Choice Menu + Image Display — HIGH

**Already covered in `CODECAMP-PHOTOGRAPHER-INVESTIGATION-REPORT.md`**

**Quick summary:**
- Predefined photo-type choices (Nature, Portrait, Urban, etc.) via `showChoices()`
- `ImageDisplay.vue` with title, description, permanentUrl preference, loading/error states
- Action dispatch: backend returns `show_image` action → game opens display GUI

---

## 7. Branching Narrative Fork (Clarity/Chaos Path) — MEDIUM

**Files:** `main/events/clarityDoor.ts`, `main/events/chaosDoor.ts`, `main/events/voidSignClarity.ts`, `main/events/voidSignChaos.ts`, `main/events/voidBook.ts`

**What it does:** Implements a **narrative fork** in the void map:
- Two signs (AI-powered) describe each path
- A void book offers a multi-turn AI conversation with branching dialogue
- Clarity door loops back to void (`changeMap('voidMap')`) — a philosophical dead-end
- Chaos door progresses to a new map (`changeMap('childhoodhome')`) — story advancement

**Why it matters:** This is a simple but effective pattern for **AI-driven narrative branching**. The signs use the same AI pipeline as NPCs; the doors are pure teleporters. Map transitions serve as the "commit point" for player choices.

**How to model it:**
- Add a `teleport` skill to our agents so the LLM can offer map transitions as narrative choices
- Use `player.changeMap()` as a quest/story progression mechanism
- AI-powered objects (signs, books) can use the same AgentRunner as NPCs with different persona prompts

---

## 8. Multi-Turn Recursive Dialogue with Dynamic Options — MEDIUM

**File:** `main/events/voidBook.ts` + `main/events/GenericNPCEvent.ts`

**What it does:** The void book is the most sophisticated dialogue implementation. After the LLM responds, if `dialogueOptions[]` is returned, the event presents them as RPGJS choices. When the player picks one, it calls the AI again with `selectedOptionId` + `conversationId`, maintaining multi-turn context. This loops recursively until no more options are returned.

**Why it matters:** Our current NPC dialogue is single-turn (player talks → NPC responds → done) or at best one follow-up choice (photographer Yes/No). Dynamic multi-turn dialogue where the **LLM controls what choices appear** is a significant UX upgrade.

**How to model it:**
- After each agent response, check if the LLM returned structured choices (e.g. via a `present_choices` skill or structured response)
- If so, show them with `player.showChoices()` and feed the selection back as a new interaction
- Use `conversationId` (or our existing AgentMemory) for context continuity

---

## 9. Unified Interactive Object Pattern — MEDIUM

**Files:** `main/events/mirror_of_artel.ts`, `main/events/calling_stone.ts`, `main/events/shrine_of_resonance.ts`, `main/events/wishing_well.ts`, `main/events/journal.ts`, `main/events/echo_notice_board.ts`, `main/events/fountain.ts`, `main/events/chest.ts`, `main/events/magic_tree.ts`

**What it does:** Non-NPC objects (chests, signs, fountains, shrines) use the **exact same AI dialogue pipeline** as NPCs. The only difference is no sprite (invisible hitbox placed via Tiled) and larger hitboxes. All intelligence lives in the backend/LLM.

**Why it matters:** We currently only have AI agents for NPC characters. But the pattern shows any interactable — a magic mirror, a talking book, a puzzle chest — can be an AI-powered entity with its own personality and memory. This multiplies content possibilities without new code.

**How to model it:**
- Our `AgentNpcEvent` already supports this if we add configs without sprites (or with object sprites)
- In Studio's NPC Builder, add an "entity type" selector: NPC / Interactive Object / Trigger
- Each type uses the same agent system but with different spawn behavior (sprite vs hitbox-only)

---

## 10. Client-Side Lovable/Frontend Communication (postMessage Bridge) — MEDIUM

**File:** `main/client.ts`

**What it does:** Full postMessage bridge for game-in-iframe communication:
- Sends `GAME_READY` on connection
- Sends `MAP_LOADED` on map join
- Sends `GAME_INTERACT_REQUEST` for NPC interactions → receives `INTERACT_RESPONSE` (including images)
- Receives `SET_PLAYER_IDENTITY` for auth
- Logs all messages for debugging

**Why it matters:** Our game is deployed in an iframe within the Lovable-built frontend. We need this exact message protocol for:
- Authentication bridging (identity → game)
- Map/player state reporting (game → Studio dashboard)
- Future: Studio triggering NPC actions in real-time

**How to model it:**
- Define a message protocol spec (message types + payloads)
- Implement in `main/client.ts` with the same event listener pattern
- Document the protocol so Studio (Lovable) can implement the other side

---

## 11. Radio Event — Action Dispatch System — MEDIUM

**File:** `main/events/RadioEvent.ts`

**What it does:** The most complete server-side action system. Calls an external API, then dispatches a response `actions[]` array. Handles 4 action types: `setEntityState` (modify other entities), `playAudio` (stream URLs), `setTile` (map modification), and `displayImage`. Also handles three response format types (`text_only`, `text_with_image`, `choice_menu`).

**Why it matters:** This is essentially a **skill execution framework** where the backend returns structured commands. Our agent system already has skills, but the "backend returns an actions array that the game dispatches" pattern could complement it for Studio-driven workflows.

**How to model it:**
- Define an `Action` type with variants: `show_image`, `play_audio`, `change_entity`, `teleport`, `set_variable`
- When agent skills produce results with side effects, return them as typed actions
- Studio workflows could also produce action arrays that get dispatched the same way

---

## 12. AI Telemetry via Socket.IO Namespace — MEDIUM

**File:** `ai-control/server.ts` (telemetry section)

**What it does:** Creates a dedicated Socket.IO namespace (`/ai-telemetry`) and emits `ai-status`, `ai-error`, and `ai-log` events whenever an AI intent executes. External monitoring tools can connect and watch in real-time.

**Why it matters:** We have no real-time monitoring of agent activity. Studio's dashboard could connect to a telemetry namespace and show live agent thinking/acting/error events.

**How to model it:**
- Add a `/agent-telemetry` namespace to our Express/Socket.IO server
- Emit events when: agent starts thinking, skill executes, error occurs, idle tick fires
- Studio listens on this namespace for the live dashboard

---

## 13. Map-Loaded Event for Frontend Sync — LOW

**File:** `main/player.ts` (`onJoinMap`)

**What it does:** On map join, emits `map-loaded` via Socket.IO to the client, which forwards it as a `MAP_LOADED` postMessage to the parent frame. The frontend knows which map the player is on.

**Why it matters:** Studio could use this to show "Player X is on map Y" in real-time, or to load map-specific data (e.g. which NPCs are on the player's current map).

**How to model it:** Straightforward socket emit in `onJoinMap` → client relays via postMessage.

---

## 14. NPC Addition/Duplication Workflows (Developer Docs) — LOW

**Files:** `WORKFLOW_ADD_NPC.md`, `WORKFLOW_DUPLICATE_NPC.md`

**What they do:** Step-by-step checklists for adding/duplicating NPCs: copy event file, change decorator metadata, add TMX object, restart. Includes common-mistake callouts and validation steps.

**Why it matters:** Our process is database-driven (Studio or YAML → `game.agent_configs` → auto-spawn), which is already better. But the **validation checklist pattern** is worth adopting: after creating an NPC in Studio, verify it spawns correctly, has the right sprite, responds to interaction.

**How to model it:** Document our NPC creation workflow (Studio flow + verification steps) in a similar checklist format.

---

## 15. Conversation Context ID for Multi-Turn — LOW

**File:** `main/utils/lovableDialogue.ts`

**What it does:** Passes `conversationId` through the API call so the backend can maintain conversation context across multiple exchanges. The backend returns a new `conversationId` with each response.

**Why it matters:** Our `AgentMemory` system already handles conversation context in-memory. But if we persist to Supabase (`game.agent_memory`), having a `conversation_id` column groups messages into coherent sessions — useful for Studio's memory viewer.

**How to model it:** Add optional `conversation_id` column to `game.agent_memory` for session grouping.

---

## Summary Table

| # | Pattern | Priority | Status in Open-RPG | Key Benefit |
|---|---------|----------|-------------------|-------------|
| 1 | AI Control Bridge (HTTP intents) | HIGH | Not present | External NPC control + Studio workflow integration |
| 2 | DB-driven spawn with retry/error reporting | HIGH | Partial (no retry/error) | Production reliability |
| 3 | TMX → DB entity sync | HIGH | Not present | Tiled as source of truth for placement |
| 4 | Generic NPC with dynamic dialogue options | HIGH | Partial (no dynamic options) | LLM-driven conversation branching |
| 5 | Socket identity bridge (auth) | HIGH | Not present | Persistent user accounts |
| 6 | Photo choices + image display | HIGH | Partial (see photographer report) | Better photographer UX |
| 7 | Branching narrative fork | MEDIUM | Not present | Story progression mechanics |
| 8 | Multi-turn recursive dialogue | MEDIUM | Not present | Deep NPC conversations |
| 9 | AI-powered interactive objects | MEDIUM | Not present | Multiply content without code |
| 10 | postMessage bridge protocol | MEDIUM | Not present | Game ↔ Studio communication |
| 11 | Action dispatch system | MEDIUM | Partial (skills exist) | Unified action framework |
| 12 | AI telemetry namespace | MEDIUM | Not present | Live monitoring in Studio |
| 13 | Map-loaded frontend sync | LOW | Not present | Real-time player tracking |
| 14 | NPC creation checklists | LOW | Not present (process is DB-driven) | Developer documentation |
| 15 | Conversation session grouping | LOW | Not present | Memory viewer in Studio |

---

## Recommendation: Keep Our Architecture, Adopt Patterns Selectively

**Short answer:** We should **keep what we have** as the core and **selectively adopt** specific Codecamp patterns. We should **not** migrate to Codecamp’s overall approach.

### Why keep our architecture

- **In-process agents vs external “Lovable brain”**  
  Our AgentRunner + LLM runs inside the game server. Codecamp’s NPCs were thin shells calling an external API. Our approach gives lower latency, no external dialogue dependency, and full control over prompts, skills, and memory. Moving to “game as dumb client, Lovable as brain” would be a **regression**.

- **Single generic NPC + DB/YAML config**  
  We already have one `AgentNpcEvent` and config-driven NPCs (Supabase `agent_configs` + YAML). Codecamp had many nearly identical event files. We’ve already solved their duplication problem; no need to copy their structure.

- **Skills + token gating**  
  Our “API-as-identity” design (skills, inventory tokens, edge functions) is a better fit for Studio and scaling than Codecamp’s single external API. Keep it.

- **Image gen on the edge**  
  We call a Supabase Edge Function from the game; API keys stay on the edge. Codecamp did image gen in their Lovable backend. Our split (game → edge → Gemini) is the right pattern; we only improve UX (choices, display component), not the architecture.

### What to adopt (migrate these patterns)

| Pattern | Why adopt |
|--------|-----------|
| **Identity bridge** (socket + `set-player-identity`) | We need Supabase Auth → RPGJS player binding for Studio and persistent memory. We don’t have this yet. |
| **Spawn retry + error reporting to DB** | Our spawn doesn’t retry or write failures back. Adding retry and a `spawn_error` (or similar) column lets Studio show why an NPC didn’t appear. |
| **Dynamic dialogue options** (LLM → choices → next turn) | Implement *the pattern* with our AgentRunner (e.g. structured response or a small skill), not their backend. Replaces hardcoded Yes/No with real branching. |
| **Unified image display** (title + description + URL) + optional photo-type choices | Better photographer UX; same component for “player requested” and “agent generated” images. |
| **postMessage / map-loaded protocol** | Needed for game-in-iframe ↔ Studio (auth, map state, future triggers). Define the contract and implement our side. |
| **Telemetry namespace** (e.g. `/agent-telemetry`) | Enables Studio to show live agent activity without changing our agent design. |

### What to consider later (not a full migration)

- **TMX → DB sync** — Useful when we want Tiled as source of truth for placement. Our current DB/YAML placement is fine for now.
- **HTTP intent bridge** — Becomes relevant when Studio workflows need to drive NPCs (e.g. “run this workflow as this NPC”). Plan for it; don’t rebuild around it yet.
- **Action dispatch array** — We already have skills. Add a unified “actions” shape only if we add more side-effect types (e.g. play_audio, set_tile) and want one dispatch path.

### What not to migrate

- **Replacing our agents with Lovable API calls** — No. Our brain stays in-process.
- **Replacing AgentNpcEvent with their GenericNPCEvent** — No. Ours is the right abstraction for our stack.
- **Copying their many per-NPC event files** — No. We already use one event class + config.

**Bottom line:** Treat Codecamp as a pattern library, not a target architecture. Keep our game + Studio + database design; pull in identity bridge, spawn robustness, dynamic choices, image UX, iframe protocol, and telemetry where they clearly improve what we’re building.

---

*This document is for PM review. No code changes were made.*
