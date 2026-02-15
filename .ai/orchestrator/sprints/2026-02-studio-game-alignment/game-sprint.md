# Game Sprint Slice — 2026-02

> Cursor's view of the master sprint. Game repo (Open-RPG) + database tasks only.
> Master: [master.md](master.md)
> **One place for all tasks in order:** [.ai/tasks/sprint-2026-02-studio-game-alignment/README.md](../../../tasks/sprint-2026-02-studio-game-alignment/README.md)

---

## Database Tasks (owned by game repo)

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| D-1 | Game schema + seed data (migration 009) | DONE | 4 tables, 4 seed NPCs, 1 integration |
| D-2 | Cross-schema grants (migration 011) | DONE | Studio can query `game.*` |
| D-3 | PostgREST exposes game schema | DONE | `pgrst.db_schemas` updated |
| D-4 | Audit seed data accessible from Studio | TODO | Verify with a test query |
| D-5 | Content store schema (migration 013) | **DONE** | 3 tables + recall RPC; see [design doc](../../briefs/cursor/2026-02/D-5-content-store-schema.md), SQL at [migrations/013](../../migrations/013_content_store.sql) |
| D-6 | Migration 012: map_entities + map_metadata | DONE | [Brief](../../briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md); 011-aligned grants |

## Game Tasks

| ID | Title | Status | Game-repo task | Brief |
|----|-------|--------|---------------|-------|
| G-0 | Load NPC configs from Supabase | DONE | NEW | [Brief](../../briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md) |
| G-1 | Modular Skill Plugin System | DONE | TASK-018a | [Brief](../../briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md) |
| tmx-enrich | Add seed NPCs to simplemap.tmx | DONE | NEW | [Brief](../../briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md) |
| G-5 | TMX parser + sync logic + CLI | DONE | NEW | [Brief](../../briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md) |
| G-6 | Optional auto-sync on server start | DONE | NEW | [Brief](../../briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md) |
| G-7 | In-game builder save-on-place persistence | TODO | NEW | Save placements to `game.map_entities` + skeleton `agent_configs`; depends D-6 + G-0 |
| G-8 | In-game event config form | TODO | NEW | Post-placement Vue form: type, name, role, sprite; depends G-7 |
| G-2 | Photographer NPC + Gemini | DONE | TASK-018 | [Brief](../../briefs/cursor/2026-02/TASK-G-2-photographer-npc.md) |
| G-3 | Content Store + Tagging | **UNBLOCKED** | TASK-019 | D-5 schema DONE; apply migration 013 + implement ContentStore.ts |
| G-4 | Associative Recall + Social Feed | HELD (foundation gate) | TASK-020 | Brief TBD |

## Order

1. **G-0** first (**FOUNDATION BLOCKER**) — make AgentManager load NPC configs from `game.agent_configs` in Supabase (currently reads YAML only)
2. **G-1** parallel with G-0 (no blockers) — skill plugin system
3. **D-6** parallel with G-0 (no code deps) — create map_entities + map_metadata tables
4. **tmx-enrich** parallel with D-6 — add 4 seed NPCs as named objects to simplemap.tmx
5. **G-5** after D-6 + tmx-enrich — TMX parser, sync logic, CLI script
6. **G-6** after G-5 — optional auto-sync on server start
7. **G-7** after D-6 + G-0 — in-game builder save-on-place persistence (writes to `map_entities` + skeleton `agent_configs`)
8. **G-8** after G-7 — post-placement config form (type, name, role, sprite)
9. **FOUNDATION GATE** — PM verifies the full pipeline (Tiled → DB → Game) after G-0 + G-5 ship
10. **G-2** after G-1 + foundation gate — Photographer NPC uses the plugin architecture
11. **D-5** ~~in parallel with G-2~~ **DONE** — migration 013 designed and ready
12. **G-3** **UNBLOCKED** (D-5 done, G-2 done) — apply migration 013 + implement ContentStore.ts
13. **G-4** after G-3 — social feed reads from content store

## Key Constraints

- All game tables in `game` schema (not `public`).
- New schema changes = new numbered migration in `Open-RPG/supabase/migrations/`.
- Skill plugins use static barrel file, not dynamic `fs.readdirSync`.
- API skills gated by inventory items (`requiredItem` in `SkillPlugin`).
- Gemini API calls go through Supabase Edge Functions, not the game server directly.
- TMX sync grants: anon=SELECT, authenticated=CRUD, service_role=ALL (match 011 pattern).
- TMX sync never overwrites Studio edits (personality, skills, model, behavior, enabled).
- Skeleton agent_configs from TMX sync are disabled by default.
- In-game builder placements write to `game.map_entities` (same table as TMX sync) — three writers, one reader, one schema.
- Builder-created skeleton `agent_configs` are disabled by default (same as TMX sync).
- Builder persistence is save-on-place — every click-to-place immediately upserts to DB.
- Builder never overwrites Studio edits to `agent_configs` (personality, skills, model, behavior, enabled).
- G-8 config form is lightweight scaffold only — deep config happens in Studio.
- Content store tables: `game.npc_content`, `game.content_tags`, `game.npc_posts` (migration 013).
- Content store grants: SELECT auto-granted (011 default privileges), authenticated gets UPDATE+DELETE on npc_posts only.
- No FK on `agent_id` in content tables (content outlives config changes, matches `agent_memory` pattern).
- Tags are free-form lowercase strings — no controlled vocabulary, no pgvector embeddings for MVP.
- `recall_content()` RPC does server-side tag-overlap query ranked by relevance then recency.
- ContentStore follows SupabaseAgentMemory pattern: write-behind flush, graceful degradation, batch inserts.
