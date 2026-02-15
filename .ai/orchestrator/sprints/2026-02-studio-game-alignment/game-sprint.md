# Game Sprint Slice — 2026-02

> Cursor's view of the master sprint. Game repo (Open-RPG) + database tasks only.
> Master: [master.md](master.md)

---

## Database Tasks (owned by game repo)

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| D-1 | Game schema + seed data (migration 009) | DONE | 4 tables, 4 seed NPCs, 1 integration |
| D-2 | Cross-schema grants (migration 011) | DONE | Studio can query `game.*` |
| D-3 | PostgREST exposes game schema | DONE | `pgrst.db_schemas` updated |
| D-4 | Audit seed data accessible from Studio | TODO | Verify with a test query |
| D-5 | Plan content store schema (migration 013+) | TODO | Design new table(s) for NPC-generated content |
| D-6 | Migration 012: map_entities + map_metadata | TODO | Plan approved; 011-aligned grants |

## Game Tasks

| ID | Title | Status | Game-repo task | Brief |
|----|-------|--------|---------------|-------|
| G-0 | Load NPC configs from Supabase | **TODO — FOUNDATION BLOCKER** | NEW | Brief TBD |
| G-1 | Modular Skill Plugin System | TODO | TASK-018a | [Brief](../../briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md) |
| tmx-enrich | Add seed NPCs to simplemap.tmx | TODO | NEW | Part of TMX sync plan |
| G-5 | TMX parser + sync logic + CLI | TODO | NEW | Plan approved; depends D-6 + tmx-enrich |
| G-6 | Optional auto-sync on server start | TODO | NEW | Behind SYNC_TMX_ON_START; depends G-5 |
| G-2 | Photographer NPC + Gemini | HELD (foundation gate) | TASK-018 | [Brief](../../briefs/cursor/2026-02/TASK-G-2-photographer-npc.md) |
| G-3 | Content Store + Tagging | HELD (foundation gate) | TASK-019 | Brief TBD |
| G-4 | Associative Recall + Social Feed | HELD (foundation gate) | TASK-020 | Brief TBD |

## Order

1. **G-0** first (**FOUNDATION BLOCKER**) — make AgentManager load NPC configs from `game.agent_configs` in Supabase (currently reads YAML only)
2. **G-1** parallel with G-0 (no blockers) — skill plugin system
3. **D-6** parallel with G-0 (no code deps) — create map_entities + map_metadata tables
4. **tmx-enrich** parallel with D-6 — add 4 seed NPCs as named objects to simplemap.tmx
5. **G-5** after D-6 + tmx-enrich — TMX parser, sync logic, CLI script
6. **G-6** after G-5 — optional auto-sync on server start
7. **FOUNDATION GATE** — PM verifies the full pipeline (Tiled → DB → Game) after G-0 + G-5 ship
8. **G-2** after G-1 + foundation gate — Photographer NPC uses the plugin architecture
9. **D-5** in parallel with G-2 — design content store schema
10. **G-3** after D-5 + G-2 — content store implementation
11. **G-4** after G-3 — social feed reads from content store

## Key Constraints

- All game tables in `game` schema (not `public`).
- New schema changes = new numbered migration in `Open-RPG/supabase/migrations/`.
- Skill plugins use static barrel file, not dynamic `fs.readdirSync`.
- API skills gated by inventory items (`requiredItem` in `SkillPlugin`).
- Gemini API calls go through Supabase Edge Functions, not the game server directly.
- TMX sync grants: anon=SELECT, authenticated=CRUD, service_role=ALL (match 011 pattern).
- TMX sync never overwrites Studio edits (personality, skills, model, behavior, enabled).
- Skeleton agent_configs from TMX sync are disabled by default.
