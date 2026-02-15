# Cross-Project Status

Last updated: 2026-02-14 (TMX sync tasks added)

---

## Current Sprint

**[2026-02-studio-game-alignment](sprints/2026-02-studio-game-alignment/master.md)**

Wire Studio to the game schema (NPC Builder, Integrations, Dashboard stats) while the game repo introduces modular skill plugins and the Photographer NPC. Keep the shared Supabase database aligned.

See [master.md](sprints/2026-02-studio-game-alignment/master.md) for full backlog, dependencies, and execution waves.

---

## FOUNDATION GATE

> **Wave 2+ work is HELD until the foundation pipeline is verified.**
> See [foundation.md](foundation.md) for the pipeline doc and verification checklist.
> See [alignment-rules.md §10](directives/alignment-rules.md) for the directive.
>
> **Known blockers:**
> 1. Game loads NPC configs from YAML, not Supabase — G-0 must ship.
> 2. TMX-to-DB sync (G-5) must ship so full pipeline (Tiled → DB → Game) is testable.
> PM runs verification after both, then signs off.

---

## In Flight

| ID | Title | Agent | Repo | Status | Brief |
|----|-------|-------|------|--------|-------|
| S-1 | NPC Builder Page | Lovable | Agent-Artel-studio | MERGED — needs verify & polish | [Brief](briefs/lovable/2026-02/TASK-S-1-npc-builder-ui.md) |
| S-2 | Integrations Page | Lovable | Agent-Artel-studio | MERGED — needs verify & polish | [Brief](briefs/lovable/2026-02/TASK-S-2-integrations-page.md) |
| S-3 | Dashboard Game Stats | Lovable | Agent-Artel-studio | MERGED — needs verify & polish | [Brief](briefs/lovable/2026-02/TASK-S-3-dashboard-game-stats.md) |
| G-0 | Load NPC configs from Supabase | Cursor | Open-RPG | **TODO — FOUNDATION BLOCKER** | Brief TBD |

## Approved (May Proceed)

| ID | Title | Agent | Repo | Brief |
|----|-------|-------|------|-------|
| G-1 | Modular Skill Plugin System | Cursor | Open-RPG | [Brief](briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md) |
| D-6 | Migration 012: map_entities + map_metadata | Cursor | Open-RPG | TMX sync plan approved |
| tmx-enrich | Add seed NPCs to simplemap.tmx | Cursor | Open-RPG | TMX sync plan approved |
| G-5 | TMX parser + sync logic + CLI | Cursor | Open-RPG | TMX sync plan approved (after D-6 + tmx-enrich) |
| G-6 | Optional auto-sync on server start | Cursor | Open-RPG | TMX sync plan approved (after G-5) |

## Held (Foundation Gate)

| ID | Title | Agent | Repo | Brief | Blocked by |
|----|-------|-------|------|-------|------------|
| G-2 | Photographer NPC + Gemini | Cursor | Open-RPG | [Brief](briefs/cursor/2026-02/TASK-G-2-photographer-npc.md) | G-1 + Foundation gate |
| S-4 | NPC Memory Viewer | Lovable | Agent-Artel-studio | [Brief](briefs/lovable/2026-02/TASK-S-4-npc-memory-viewer.md) | Foundation gate |

## Done

| ID | Title | Agent | Repo | Completed |
|----|-------|-------|------|-----------|
| D-1 | Game schema + seed data (migration 009) | Cursor | Open-RPG | 2026-02-14 |
| D-2 | Cross-schema grants (migration 011) | Cursor | Open-RPG | 2026-02-14 |
| D-3 | PostgREST schema exposure | Cursor | Open-RPG | 2026-02-14 |

## Pending (Briefs Not Yet Written)

| ID | Title | Agent | Blocked by |
|----|-------|-------|------------|
| G-3 | Content Store + Tagging | Cursor | D-5, G-2, foundation gate |
| G-4 | Associative Recall + Social Feed | Cursor | G-3 |
| S-5 | Lovable Feed Integration | Lovable | G-4 |
| D-4 | Audit seed data + reconcile grants | Orchestrator | — |
| D-5 | Content store schema design | Orchestrator | — |

---

## Execution Waves

### Wave 1 — In Progress
- **Studio (Lovable):** S-1, S-2, S-3 — CODE MERGED, briefs reframed as verify & polish
- **Game (Cursor):** G-0 (Load configs from Supabase) — **FOUNDATION BLOCKER**, brief to write
- **Game (Cursor):** G-1 (Modular Skill Plugin System) — TODO, brief ready, can run parallel with G-0
- **Game (Cursor):** D-6 → tmx-enrich → G-5 → G-6 (TMX-to-DB sync pipeline) — plan approved
- **DB (Orchestrator):** D-4 (Audit seed data + reconcile grants) — TODO

### FOUNDATION GATE — PM verifies the pipeline after G-0 + G-5 ship

### Wave 2 — After Foundation Gate
- **Game:** G-2 (Photographer NPC, after G-1 + foundation gate)
- **Studio:** S-4 (Memory Viewer, after foundation gate)
- **DB:** D-5 (Content store schema design)

### Wave 3 — After Wave 2
- **Game:** G-3 (Content Store), then G-4 (Social Feed)
- **Studio:** S-5 (Feed Integration, after G-4)

---

## Game Repo Status (from Open-RPG/.ai/status.md)

- Sprints 0-4: DONE
- Sprint 5 (API-as-Identity + Social): NEXT — G-1 is the first task
- Sprint 2 (LLM Gateway): BACKLOG (deferred to Studio integration)
- Sprint 6 (Evaluation Arena): BACKLOG
- **NPC config loading: currently YAML-based, not Supabase-based (G-0 needed)**

## Studio Repo Status

- Application shell: Complete
- Canvas / workflow builder: In development
- **Game integration: NPC Builder, Integrations, Dashboard stats — all MERGED to main**
- Studio writes to Supabase correctly; game-side reading is the gap
- Next Studio work: verify/polish merged code; S-4 held until foundation gate

## Database Status

- `game` schema: Live, 4 tables, seed data (4 NPCs, 1 integration)
- Cross-schema grants: Applied (migration 011); Studio's overly-broad migration needs reconciliation (D-4)
- PostgREST: `public`, `studio`, `game` exposed
- **Pending: migration 012 (map_entities + map_metadata)** — plan approved, Cursor to implement (D-6)
