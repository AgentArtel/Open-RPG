# Sprint 2026-02 — Studio + Game Alignment (Cursor tasks)

**Status:** IN PROGRESS  
**Agent:** Cursor (game repo)  
**One place for all tasks:** This file. Order and briefs match the orchestrator sprint; cross-project master: [.ai/orchestrator/sprints/2026-02-studio-game-alignment/master.md](../../orchestrator/sprints/2026-02-studio-game-alignment/master.md).

When you complete a task, update the Status column here and in [.ai/orchestrator/status.md](../../orchestrator/status.md). When this whole sprint is closed, sync the backlog (e.g. mark sprint-5 TASK-018a/018 DONE); see [.ai/tasks/README.md](../../tasks/README.md) "Backlog vs current sprint."

---

## Execution order (do in this order)

Cursor’s work for this sprint, in the order that makes sense. Do Wave 1 first; Wave 2 starts after the **foundation gate** (G-0 + G-5 done + PM verification).

### Wave 1 — Do now (can parallelize where noted)

| # | ID | Title | Status | Depends | Brief |
|---|-----|-------|--------|---------|-------|
| 1 | **G-0** | Load NPC configs from Supabase | DONE | — | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md) — **FOUNDATION BLOCKER** |
| 2 | **G-1** | Modular Skill Plugin System | DONE | — | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md) — parallel with G-0 |
| 3 | **D-6** | Migration 012: map_entities + map_metadata | DONE | D-1 | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md) — parallel with G-0 |
| 4 | **tmx-enrich** | Add seed NPCs to simplemap.tmx | DONE | — | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md) — parallel with D-6 |
| 5 | **G-5** | TMX parser + sync logic + CLI | DONE | D-6, tmx-enrich | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md) |
| 6 | **G-6** | Optional auto-sync on server start | DONE | G-5 | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md) |

**Foundation gate:** After G-0 and G-5 ship, PM verifies the full pipeline (Tiled → DB → Game), then Wave 2 can start.

### Wave 2 — After foundation gate

| # | ID | Title | Status | Depends | Brief |
|---|-----|-------|--------|---------|-------|
| 7 | **G-2** | Photographer NPC + Gemini Image Generation | DONE | G-1 + foundation gate | [Brief](../../orchestrator/briefs/cursor/2026-02/TASK-G-2-photographer-npc.md) |
| 8 | **D-5** | Plan content store schema (migration 013+) | TODO | — | Orchestrator; design only |
| 9 | **G-3** | Content Store + Tagging | HELD | D-5, G-2 | Brief TBD |
| 10 | **G-4** | Associative Recall + Social Feed | HELD | G-3 | Brief TBD |

---

## Task ID ↔ game-repo task mapping

| Sprint ID | Game-repo task | Notes |
|-----------|----------------|-------|
| G-0 | NEW | Load configs from Supabase (no TASK-XXX) |
| G-1 | TASK-018a | [sprint-5-api-identity-social/TASK-018a.md](../sprint-5-api-identity-social/TASK-018a.md) |
| G-2 | TASK-018 | [sprint-5-api-identity-social/TASK-018.md](../sprint-5-api-identity-social/TASK-018.md) |
| G-3 | TASK-019 | [sprint-5-api-identity-social/TASK-019.md](../sprint-5-api-identity-social/TASK-019.md) |
| G-4 | TASK-020 | [sprint-5-api-identity-social/TASK-020.md](../sprint-5-api-identity-social/TASK-020.md) |
| D-6, tmx-enrich, G-5, G-6 | NEW | TMX-to-DB sync (no TASK-XXX) |

---

## DB tasks (Cursor implements, Orchestrator reviews)

| ID | Title | Status | Brief |
|----|-------|--------|-------|
| D-1 | Game schema + seed data (migration 009) | DONE | — |
| D-2 | Cross-schema grants (migration 011) | DONE | — |
| D-3 | PostgREST exposes game schema | DONE | — |
| D-4 | Audit seed data + reconcile grants | TODO | Orchestrator (verification) |
| D-5 | Plan content store schema | TODO | Orchestrator (design) |
| D-6 | Migration 012: map_entities + map_metadata | DONE | See Wave 1 table above |

---

## Constraints (from orchestrator)

- All game tables in `game` schema. New migrations in `supabase/migrations/`.
- Skill plugins: static barrel file, no dynamic `fs.readdirSync`.
- API skills gated by inventory items (`requiredItem`).
- Gemini via Supabase Edge Functions, not game server directly.
- TMX sync: anon=SELECT, authenticated=CRUD, service_role=ALL. Never overwrite Studio edits. Skeleton agent_configs disabled by default.

---

## Where to start

1. **G-0** (foundation blocker) — [TASK-G-0-supabase-config-loading.md](../../orchestrator/briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md)  
2. In parallel if you prefer: **G-1**, **D-6**, **tmx-enrich** (briefs linked above).  
3. Then **G-5** (after D-6 + tmx-enrich), then **G-6**.

Status and cross-project view: [.ai/orchestrator/status.md](../../orchestrator/status.md).
