# Foundation: Studio → DB → Game Pipeline

> This doc explains how data flows from Studio to the game.
> **Read this before approving any Wave 2+ work.**
> Last updated: 2026-02-14

---

## The Idea (What We're Building Toward)

Studio is a visual admin panel. The game is a live RPGJS server. They never talk to each other directly — the shared Supabase database is the only bridge.

```
┌─────────────┐       ┌───────────────────┐       ┌────────────────┐
│   Studio     │──────►│  Supabase (game.)  │◄──────│   Game Server  │
│  (React SPA) │ WRITE │                   │ READ  │  (RPGJS + LLM) │
│              │       │  agent_configs     │       │                │
│              │       │  api_integrations  │       │                │
│              │◄──────│  agent_memory      │──────►│                │
│              │ READ  │  player_state      │ WRITE │                │
└─────────────┘       └───────────────────┘       └────────────────┘
```

### The four tables and who owns them

| Table | Schema | Studio | Game Server |
|-------|--------|--------|-------------|
| `agent_configs` | `game` | READ + WRITE (creates/edits NPCs) | READ (loads NPC configs at runtime) |
| `api_integrations` | `game` | READ + WRITE (manages API tools) | READ (discovers available skills) |
| `agent_memory` | `game` | READ ONLY (debugging viewer) | WRITE (stores conversation history) |
| `player_state` | `game` | READ ONLY (dashboard stats) | WRITE (persists player progress) |

### How it should work end-to-end (NPC example)

1. **You create an NPC in Studio** — fill in the form (name, model, prompt, spawn point, skills, inventory). Studio calls `gameDb().from('agent_configs').insert(...)`. A row now exists in `game.agent_configs`.

2. **The game server starts (or a map loads)** — it queries `game.agent_configs` where `spawn.map` matches the current map, gets back the NPC rows, and spawns character events on the RPGJS map.

3. **A player talks to the NPC** — the game server reads the NPC's model, system prompt, and skill list from the config row. It runs the LLM conversation. Each message is written to `game.agent_memory`.

4. **You check the conversation in Studio** — the Memory Viewer (S-4) reads from `game.agent_memory` filtered by `agent_id` and shows a chat-style log.

---

## Current State (What Actually Works Today)

### Studio side — CONNECTED

Studio's game integration is **merged and functional**:

- `src/lib/gameSchema.ts` exports `gameDb()` → `supabase.schema('game')`
- `src/integrations/supabase/game-types.ts` defines `GameDatabase` extending the auto-generated types with a `game` schema key
- `src/integrations/supabase/client.ts` creates the client as `createClient<GameDatabase>(...)`
- NPCs page (`src/pages/NPCs.tsx`) does full CRUD on `game.agent_configs` via `gameDb()`
- Integrations page (`src/pages/Integrations.tsx`) does full CRUD on `game.api_integrations` via `gameDb()`
- Dashboard (`src/pages/Dashboard.tsx`) reads counts from all 4 game tables

**Studio writes to the database correctly.** When you create an NPC in Studio, a row appears in `game.agent_configs`.

### Database — BUILT

- Migration 009 created the `game` schema with all 4 tables and seed data (4 NPCs, 1 integration)
- Migration 011 set cross-schema grants (Studio roles can access game tables)
- PostgREST exposes the `game` schema

### Game side — PARTIALLY CONNECTED

Here is where the gap is.

**What IS connected:**
- `src/config/supabase.ts` — Supabase client singleton with `db: { schema: 'game' }` and service_role key
- `src/agents/memory/SupabaseAgentMemory.ts` — writes conversation history to `game.agent_memory` ✅
- `src/persistence/PlayerStateManager.ts` — writes player state to `game.player_state` ✅

**What is NOT connected:**
- **`AgentManager.loadConfigs()` reads NPC configs from YAML files, not from Supabase.**

The current loading code (`src/agents/core/AgentManager.ts`, lines 154-173):
```
loadConfigs(configDir) {
    reads all .yaml/.yml files from src/config/agents/
    parses each file into an AgentConfig
    registers each agent
}
```

This is called at startup and at map load with `'src/config/agents'` as the directory. There are currently 2 YAML files on disk:
- `src/config/agents/elder-theron.yaml`
- `src/config/agents/test-agent.yaml`

Meanwhile, the database has 4 seed NPCs (from migration 009) that were created for testing Studio.

**The implication:** Right now, if you create an NPC in Studio, the row goes into the database, but the game server will never see it. The game server only reads YAML files from disk. The "Studio → DB → Game" pipeline for NPC configs has a gap at "DB → Game."

### What about API integrations?

The game's skill system currently uses a hardcoded `skillMap` (AgentManager.ts, lines ~121-127). G-1 (Modular Skill Plugin System) will replace this with a plugin registry. The brief for G-1 already includes reading skill metadata, but it does NOT include reading from `game.api_integrations` in Supabase. Same gap — Studio writes integration configs to the DB, but the game doesn't read them from there.

---

## The Gap: What Needs to Happen

A new prerequisite task is needed: **the game server must load NPC configs from `game.agent_configs` instead of (or in addition to) YAML files.** This is a game-repo (Cursor) task.

Specifically:
1. `AgentManager.loadConfigs()` should query `gameDb().from('agent_configs').select('*')` and parse the rows into `AgentConfig` objects
2. YAML loading can remain as a fallback (for offline development without Supabase), but Supabase should be the primary source when available
3. Similarly, the skill plugin system (G-1) should eventually discover available integrations from `game.api_integrations` rather than being fully hardcoded

Until this is done, the Studio → DB → Game pipeline is incomplete. Studio writes to a database that the game doesn't read from for NPC configs.

---

## Verification Checklist

> Run these steps yourself (or with Cursor/Lovable). All four must pass before Wave 2 work begins.

### Step 1: Studio can write NPC configs to the database

- [ ] Open Studio → NPCs page
- [ ] Create a new NPC (any test name/id)
- [ ] Verify the row appears in `game.agent_configs` (check via Supabase dashboard or `gameDb().from('agent_configs').select('*')`)
- [ ] Edit the NPC, verify the row updates
- [ ] Delete the NPC, verify the row is removed

### Step 2: Studio can write API integrations to the database

- [ ] Open Studio → Integrations page
- [ ] Create a new integration (any test data)
- [ ] Verify the row appears in `game.api_integrations`
- [ ] Edit and delete work correctly

### Step 3: Game server loads NPC configs from the database

> **BLOCKED — this is the gap.** The game currently loads from YAML files.
> A new task (proposed: G-0) must add Supabase-based config loading to `AgentManager.loadConfigs()`.

- [ ] Start the game server
- [ ] Verify that NPCs from `game.agent_configs` (not just YAML files) appear on the map
- [ ] Create an NPC in Studio → restart the game → the new NPC spawns

### Step 4: Game server writes memory that Studio can read

- [ ] Talk to an NPC in the game
- [ ] Verify that conversation messages appear in `game.agent_memory`
- [ ] Open Studio → NPCs → click the NPC → Memory tab shows the conversation
- [ ] (Memory tab is S-4 — this step verifies the DB path, not the UI)

### Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Studio → DB (configs) | LIKELY WORKS | Code is merged, needs manual verification |
| 2. Studio → DB (integrations) | LIKELY WORKS | Code is merged, needs manual verification |
| 3. DB → Game (configs) | **BLOCKED** | Game reads YAML, not Supabase. New task needed. |
| 4. Game → DB → Studio (memory) | PARTIALLY WORKS | Game writes memory to Supabase. Studio UI (S-4) not yet built. |

---

## What This Means for the Sprint

The discovery that the game loads from YAML (not Supabase) means:

1. **G-2 (Photographer NPC) is doubly blocked** — it needs G-1 (skill plugins) AND it needs the game to actually load NPC configs from the DB. Without DB loading, the Photographer can only be created as another YAML file, defeating the purpose of Studio.

2. **S-4 (Memory Viewer) is partially affected** — the UI can be built, but Step 4 of verification can't fully pass until the game is writing memory for DB-loaded NPCs (not just YAML-loaded ones).

3. **G-1 (Skill Plugins) can proceed** — it's a code architecture task within the game. But its brief should be updated to note that plugin discovery should consider reading from `game.api_integrations` as a future integration point.

4. **A new task is needed** — proposed as **G-0: Load NPC configs from Supabase**. This is a prerequisite for the entire "Studio → DB → Game" pipeline to work.
