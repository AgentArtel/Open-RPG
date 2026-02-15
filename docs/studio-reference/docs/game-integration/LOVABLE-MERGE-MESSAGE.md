# Message for Lovable — What Was Merged to `main` and Why

**Date:** 2026-02-14  
**Use this** to brief Lovable (or paste into a PM message) so they know what landed on Studio `main` and why to work from it.

---

## What was pushed to `main`

We merged the branch **`claude/studio-schema-npc-integration`** into Agent-Artel-studio **`main`**. Everything below is now on `main` and is the version you should use.

### New files

| File | Purpose |
|------|--------|
| **`src/lib/gameSchema.ts`** | **`gameDb()`** helper — single place that returns `supabase.schema('game')`. Use this for every query to game tables so Studio talks to the same data the game uses. |
| **`src/pages/Integrations.tsx`** | Full **Integrations** page: list, create, edit, delete, and enable/disable rows in `game.api_integrations`. All access via `gameDb()`. |
| **`docs/game-integration/NPC-BUILDER-PLAN.md`** | Canonical spec for the NPC Builder: data pattern, fields, checklist. Single source of truth for this feature. |

### Updated files

| File | What changed |
|------|----------------|
| **`src/pages/NPCs.tsx`** | All Supabase calls now use **`gameDb()`** for `agent_configs` and `api_integrations` (no default schema). Export renamed to `NpcBuilder`. |
| **`src/pages/Dashboard.tsx`** | New **game stats** row: Active NPCs, Player Messages (conversations), API Integrations, Online Players — all read from `game` schema via `gameDb()`. |
| **`src/App.tsx`** | Routes for **NPCs** and **Integrations** pages. |
| **`src/components/ui-custom/Sidebar.tsx`** | Nav items for NPCs (Users icon) and Integrations (Puzzle icon). |
| **`src/components/npcs/NPCCard.tsx`**, **`NPCFormModal.tsx`** | Aligned with game schema and `gameDb()` usage. |
| **`docs/game-integration/README.md`** | Link to NPC-BUILDER-PLAN. |
| **`.lovable/plan.md`** | Plan updated to reflect current integration. |

---

## Why this is better than what was implemented before

1. **Correct schema every time**  
   Game data lives in the **`game`** schema, not `public`. The earlier NPC Builder used the default Supabase client and would read/write `public.agent_configs`, which the game never uses. This merge uses **`gameDb()`** (or equivalently `supabase.schema('game')`) everywhere, so Studio and the game share the same NPC and integration data.

2. **One pattern, no mistakes**  
   `src/lib/gameSchema.ts` gives you a single helper. Every game-table query goes through `gameDb().from('agent_configs')` or `gameDb().from('api_integrations')`, etc. That avoids accidental `supabase.from(...)` calls that hit the wrong schema and keeps TypeScript and caching consistent.

3. **Complete feature set**  
   You now have not only the NPC Builder wired to the game schema, but also the **Integrations** page (full CRUD for API integrations) and **Dashboard** game stats (NPC count, message count, integration count, player count). All of these use the `game` schema so the numbers and data match the live game.

4. **Documented and canonical**  
   `docs/game-integration/NPC-BUILDER-PLAN.md` is the single source of truth for the NPC Builder. It spells out the `gameDb()` pattern, field mappings, and checklist so future changes stay consistent.

---

## What you should do next

1. **Pull latest `main`** in the Agent-Artel-studio repo so your workspace matches what was merged.
2. **Use `gameDb()` for all game data** — any new or edited code that touches `agent_configs`, `api_integrations`, `agent_memory`, or `player_state` should use `gameDb().from(...)`, not `supabase.from(...)`.
3. **Use the docs** — `docs/game-integration/NPC-BUILDER-PLAN.md` and `TASK-game-schema-integration.md` (and the rest of that folder) for any follow-up work on NPCs, Integrations, or dashboard stats.

If you have questions about why the game uses a separate schema or how Studio’s RLS/grants work, see `docs/supabase-schema.md` in the game repo and the VISION doc in this folder.

---

**TL;DR:** We merged a full game-integration pass into `main`: NPC Builder, Integrations page, and Dashboard game stats, all using the **`game`** schema via **`gameDb()`**. Pull `main` and use this as the base for all future Studio work on game data.
