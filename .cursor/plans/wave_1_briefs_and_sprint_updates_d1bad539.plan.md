---
name: Wave 1 briefs and sprint updates
overview: Create five Cursor briefs for Wave 1 tasks (G-0, D-6, tmx-enrich, G-5, G-6), then update the orchestrator sprint, status, and Briefs table so the task queue is aligned and every Wave 1 task has a written brief.
todos: []
isProject: false
---

# Wave 1 Briefs and Sprint/Status/Task-Queue Updates

## Scope

- **In scope:** Create 5 new brief files; update [master.md](.ai/orchestrator/sprints/2026-02-studio-game-alignment/master.md) Briefs table and task links; update [game-sprint.md](.ai/orchestrator/sprints/2026-02-studio-game-alignment/game-sprint.md) Brief column; update [status.md](.ai/orchestrator/status.md) In Flight and Approved brief links.
- **Out of scope:** Lovable briefs (S-1–S-5), Wave 2+ briefs (G-3, G-4, D-5), and any code or migration changes.

## 1. Create five brief files

All under [.ai/orchestrator/briefs/cursor/2026-02/](.ai/orchestrator/briefs/cursor/2026-02/). Use the same structure as [TASK-G-1-modular-skill-plugin.md](.ai/orchestrator/briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md): header block (Sprint, Target repo, Agent, Priority, Depends on, Blocks), Goal, Context, Deliverables, Acceptance Criteria, Do, Don't, Reference.

### 1.1 G-0 — `TASK-G-0-supabase-config-loading.md`

- **Goal:** Game server loads NPC configs from `game.agent_configs` in Supabase as primary source; YAML remains optional fallback when Supabase is unavailable.
- **Context:** [foundation.md](.ai/orchestrator/foundation.md) "The Gap" and "What is NOT connected"; `AgentManager.loadConfigs()` currently reads YAML only (see `src/agents/core/AgentManager.ts`).
- **Deliverables:** (1) Load configs from Supabase (e.g. `getSupabaseClient().schema('game').from('agent_configs').select('*')` or use existing RPC `get_agent_configs_for_map` if map-scoped); (2) map DB rows to `AgentConfig` (spawn, personality, skills, model, behavior, inventory, enabled); (3) filter `enabled = true`; (4) keep YAML fallback for offline/dev.
- **Acceptance:** Game starts; NPCs from DB spawn on map; create NPC in Studio, restart game, new NPC appears; no regression for existing NPCs.
- **Reference:** foundation.md, `supabase/migrations/009_game_schema.sql` (seed + RPC).

### 1.2 D-6 — `TASK-D-6-migration-012-map-entities.md`

- **Goal:** Add migration `012_map_entities.sql` with `game.map_entities`, `game.map_metadata`, 011-aligned grants, and orphan-behavior comment.
- **Context:** [TMX plan](.cursor/plans/tmx-to-db_sync_layer_662fb5b6.plan.md) Phase 1; Cursor implements after schema review.
- **Deliverables:** Single migration file: CREATE TABLE for both tables (columns per plan); GRANT SELECT to anon, SELECT/INSERT/UPDATE/DELETE to authenticated, ALL to service_role for both tables; SQL comment documenting orphan behavior (deleting `map_entities` row leaves `agent_configs` row orphaned).
- **Acceptance:** Migration runs; Studio/game access matches 011 pattern; no anon write.
- **Reference:** TMX plan Phase 1 (tables + grants), [011_studio_cross_schema_access.sql](supabase/migrations/011_studio_cross_schema_access.sql) pattern.

### 1.3 tmx-enrich — `TASK-tmx-enrich-seed-npcs-in-tmx.md`

- **Goal:** Add the four seed NPCs as named objects in `simplemap.tmx` with correct custom properties so G-5 sync is testable; coordinates match migration 009.
- **Context:** TMX plan Phase 0 and "Decision: Seed NPCs in TMX"; [009_game_schema.sql](supabase/migrations/009_game_schema.sql) for spawn coordinates.
- **Deliverables:** Edit [main/worlds/maps/simplemap.tmx](main/worlds/maps/simplemap.tmx): add objects `elder-theron` (300,250), `test-agent` (450,350), `photographer` (500,200), `artist` (150,400) with properties `entityType=ai-npc`, `displayName`, `sprite`; add `role` for elder-theron, `tools` for photographer; update `nextobjectid` if needed.
- **Acceptance:** Four named objects present with correct props; `start` and `EV-1` unchanged; TMX valid.
- **Reference:** TMX plan Phase 0 (XML snippet), 009 for coordinates.

### 1.4 G-5 — `TASK-G-5-tmx-parser-sync-cli.md`

- **Goal:** Implement TMX parser, sync logic (map_entities + skeleton agent_configs), and CLI `npm run sync-maps`.
- **Context:** TMX plan Phases 2–4; depends on D-6 and tmx-enrich.
- **Deliverables:** (1) `src/sync/parseTmx.ts` — world file discovery, TMX parse via fast-xml-parser, entity + map metadata extraction per plan property table; (2) `src/sync/syncMapEntities.ts` — upsert map_entities and map_metadata, for ai-npc create/link skeleton agent_configs (enabled=false), never overwrite Studio-edited fields (only spawn/graphic when config exists); (3) `scripts/sync-maps.ts` — single-map and all-maps modes; (4) add `fast-xml-parser` and `sync-maps` script to package.json; (5) document SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.example.
- **Acceptance:** `npx tsx scripts/sync-maps.ts` syncs all maps; map_entities and map_metadata populated; skeleton configs only when missing and disabled; existing configs get only spawn/graphic updated.
- **Reference:** TMX plan Phases 2–4, property mapping and entity-type derivation.

### 1.5 G-6 — `TASK-G-6-auto-sync-on-server-start.md`

- **Goal:** Optional TMX sync on server start behind env flag; non-blocking.
- **Context:** TMX plan Phase 5; depends on G-5.
- **Deliverables:** In `main/server.ts` (onStart), if `SYNC_TMX_ON_START === 'true'`, call sync (e.g. `syncAllMaps().catch(err => console.error('[TMX-Sync]', err.message))`); add `SYNC_TMX_ON_START` to `.env.example`.
- **Acceptance:** With env set, server start triggers sync; with env unset, no sync; sync failure does not prevent server start.
- **Reference:** TMX plan Phase 5.

---

## 2. Update orchestrator docs

### 2.1 [master.md](.ai/orchestrator/sprints/2026-02-studio-game-alignment/master.md)

- **Game Tasks table (around line 36):** Change G-0 Brief from "Brief TBD (orchestrator to write)" to link: `[TASK-G-0-supabase-config-loading.md](../../briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md)`. Add Brief links for G-5 and G-6 (D-6 and tmx-enrich are not in the Game Tasks table; D-6 is in Database Tasks).
- **Briefs table (lines 142–159):**  
  - G-0: Status "TO WRITE" → "WRITTEN"; location already correct.  
  - D-6: Status "PLAN APPROVED" → "WRITTEN"; location `briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md`.  
  - tmx-enrich: Add row: Task tmx-enrich, Brief `briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md`, Status WRITTEN.  
  - G-5: Status "PLAN APPROVED" → "WRITTEN"; location `briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md`.  
  - G-6: Status "PLAN APPROVED" → "WRITTEN"; location `briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md`.

### 2.2 [game-sprint.md](.ai/orchestrator/sprints/2026-02-studio-game-alignment/game-sprint.md)

- **Database Tasks table:** D-6 Notes: add "Brief: [TASK-D-6-migration-012-map-entities.md](../../briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md)" or add a Brief column and link (optional; current table has no Brief column for DB tasks).
- **Game Tasks table:**  
  - G-0: "Brief TBD" → `[Brief](../../briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md)`.  
  - tmx-enrich: "Part of TMX sync plan" → `[Brief](../../briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md)`.  
  - G-5: "Plan approved; depends D-6 + tmx-enrich" → `[Brief](../../briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md)`.  
  - G-6: "Behind SYNC_TMX_ON_START; depends G-5" → `[Brief](../../briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md)`.

### 2.3 [status.md](.ai/orchestrator/status.md)

- **In Flight:** G-0 "Brief TBD" → `[Brief](briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md)`.
- **Approved:** Replace "TMX sync plan approved" with brief links for D-6, tmx-enrich, G-5, G-6 (same filenames as above; paths relative to `.ai/orchestrator/`).
- **Execution Waves (Wave 1):** Change "brief to write" to "brief ready" for G-0; change "plan approved" to "briefs ready" for D-6 → tmx-enrich → G-5 → G-6.

---

## 3. File and link summary


| New file                                                                        | Purpose                             |
| ------------------------------------------------------------------------------- | ----------------------------------- |
| `.ai/orchestrator/briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md`    | G-0: Load NPC configs from Supabase |
| `.ai/orchestrator/briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md` | D-6: Migration 012                  |
| `.ai/orchestrator/briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md`    | tmx-enrich: Seed NPCs in TMX        |
| `.ai/orchestrator/briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md`        | G-5: Parser + sync + CLI            |
| `.ai/orchestrator/briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md`  | G-6: Auto-sync on start             |


**Links:** In game-sprint and status, use relative paths from the doc (e.g. `../../briefs/cursor/2026-02/...` from game-sprint; `briefs/cursor/2026-02/...` from status.md).

---

## 4. Order of execution

1. Create the five brief files (any order).
2. Update master.md (Briefs table + Game Tasks Brief column).
3. Update game-sprint.md (Game Tasks Brief column; optionally D-6).
4. Update status.md (In Flight, Approved, Wave 1 text).

No dependency between the five briefs; doc updates can follow in one pass.