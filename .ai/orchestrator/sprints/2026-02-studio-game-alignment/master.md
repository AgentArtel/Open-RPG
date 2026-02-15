# Master Backlog — 2026-02 Studio + Game Alignment

Last updated: 2026-02-15 (D-5 content store schema DONE; migration 013 designed)

---

## FOUNDATION GATE

> **No Wave 2+ work may begin until the Foundation Verification passes and PM signs off.**
> See [foundation.md](../../foundation.md) for the full pipeline doc and verification checklist.
> See [alignment-rules.md §10](../../directives/alignment-rules.md) for the directive.
>
> **Known blockers:**
> 1. The game server loads NPC configs from YAML files, not from Supabase — G-0 must ship.
> 2. TMX-to-DB sync (G-5) must ship so the full pipeline (Tiled → DB → Game) is testable.

---

## Database Tasks (D-)

| ID | Title | Status | Owner | Notes |
|----|-------|--------|-------|-------|
| D-1 | Game schema + seed data (migration 009) | DONE | Game repo | `game` schema with 4 tables, 4 seed NPCs, 1 integration |
| D-2 | Cross-schema grants (migration 011) | DONE | Game repo | Studio roles can read/write config tables, read runtime tables |
| D-3 | Verify PostgREST exposes `game` schema | DONE | Game repo | `pgrst.db_schemas = 'public, studio, game'` |
| D-4 | Audit seed data + reconcile grants | TODO | Orchestrator | Verify seed data visible from Studio; also reconcile Studio's overly-broad grant migration with game repo's 011 (see alignment-rules.md §9) |
| D-5 | Content store schema (migration 013) | **DONE** | Orchestrator | 3 tables (`npc_content`, `content_tags`, `npc_posts`) + `recall_content` RPC; [design doc](../../briefs/cursor/2026-02/D-5-content-store-schema.md) |
| D-6 | Migration 012: map_entities + map_metadata | DONE | Orchestrator (review) → Cursor | Two new game tables for TMX-synced entities; 011-aligned grants; orphan-behavior documented |

---

## Game Tasks (G-)

| ID | Title | Status | Owner | Game-repo task | Brief |
|----|-------|--------|-------|---------------|-------|
| G-0 | Load NPC configs from Supabase | DONE | Cursor | NEW | [TASK-G-0-supabase-config-loading.md](../../briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md) |
| G-1 | Modular Skill Plugin System | TODO | Cursor | TASK-018a | [TASK-G-1-modular-skill-plugin.md](../../briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md) |
| G-2 | Photographer NPC + Gemini Image Generation | DONE | Cursor | TASK-018 | [TASK-G-2-photographer-npc.md](../../briefs/cursor/2026-02/TASK-G-2-photographer-npc.md) |
| G-3 | Content Store + Tagging | TODO | Cursor | TASK-019 | D-5 schema DONE; G-2 DONE; **UNBLOCKED** — apply migration 013 + implement ContentStore |
| G-4 | Associative Recall + Social Feed | TODO | Cursor | TASK-020 | Brief TBD (depends on G-3) |
| G-5 | TMX parser + sync logic + CLI script | DONE | Cursor | NEW | [TASK-G-5-tmx-parser-sync-cli.md](../../briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md) |
| G-6 | Optional auto-sync on server start | DONE | Cursor | NEW | [TASK-G-6-auto-sync-on-server-start.md](../../briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md) |
| G-7 | In-game builder save-on-place persistence | TODO | Cursor | NEW | Save every placement to `game.map_entities` + skeleton `agent_configs`; depends on D-6 + G-0 |
| G-8 | In-game event config form | TODO | Cursor | NEW | Post-placement Vue form: type, name, role, sprite; depends on G-7 |

---

## Studio Tasks (S-)

| ID | Title | Status | Owner | Brief |
|----|-------|--------|-------|-------|
| S-1 | NPC Builder Page (CRUD for agent_configs) | MERGED — verify & polish | Lovable | [TASK-S-1-npc-builder-ui.md](../../briefs/lovable/2026-02/TASK-S-1-npc-builder-ui.md) |
| S-2 | Integrations Page (CRUD for api_integrations) | MERGED — verify & polish | Lovable | [TASK-S-2-integrations-page.md](../../briefs/lovable/2026-02/TASK-S-2-integrations-page.md) |
| S-3 | Dashboard Game Stats | MERGED — verify & polish | Lovable | [TASK-S-3-dashboard-game-stats.md](../../briefs/lovable/2026-02/TASK-S-3-dashboard-game-stats.md) |
| S-4 | NPC Memory Viewer | TODO | Lovable | [TASK-S-4-npc-memory-viewer.md](../../briefs/lovable/2026-02/TASK-S-4-npc-memory-viewer.md) |
| S-5 | Lovable Feed Integration (social feed UI) | TODO | Lovable | TASK-021; Brief TBD (depends on G-4) |
| S-6 | Studio Map Entity Browser | TODO | Lovable | Browse `game.map_entities` per map, link ai-npc rows to NPC Builder; depends on D-6 |

---

## Dependencies

```
D-1 (game schema)         ──► S-1, S-2, S-3  (Studio pages read/write game tables)
D-2 (cross-schema grants) ──► S-1, S-2, S-3  (Studio needs permission to query game schema)
D-4 (audit seed data)     ──► S-1             (verify Studio can see seed NPCs before building UI)

G-0 (DB config loading)   ──► FOUNDATION GATE (game must read NPC configs from Supabase)
D-6 (map_entities schema) ──► G-5             (tables must exist before sync can write)
tmx-enrich (seed in TMX)  ──► G-5             (TMX needs real data for sync to test)
G-5 (TMX sync)            ──► G-6             (auto-sync needs sync logic)
G-5 (TMX sync)            ──► FOUNDATION GATE (full pipeline: TMX → DB → Game)
FOUNDATION GATE           ──► G-2, S-4, S-5, G-3, G-4  (all Wave 2+ work)

G-1 (skill plugins)       ──► G-2             (Photographer NPC uses the plugin architecture)
G-2 (Photographer)        ──► G-3             (content store holds Photographer's generated images)
G-3 (content store)       ──► G-4             (social feed reads from content store)
G-4 (social feed)         ──► S-5             (Lovable feed UI renders game social feed data)

D-5 (content store schema)──► G-3             (schema design must precede implementation)

S-1 (NPC Builder)         ──► S-4             (Memory Viewer is a tab inside the NPC detail view)

D-6 (map_entities schema) ──► G-7             (builder writes to map_entities — table must exist)
G-0 (DB config loading)   ──► G-7             (builder creates skeleton agent_configs — runtime must read from DB)
G-7 (builder persistence) ──► G-8             (config form fires after placement is persisted)
D-6 (map_entities schema) ──► S-6             (Studio reads map_entities — table must exist)
```

### Dependency summary — what can start now

**Immediately (no blockers):**
- **S-1/S-2/S-3** — verify & polish (merged code)
- **G-0** — Load NPC configs from Supabase (**FOUNDATION BLOCKER**)
- **G-1** — Modular Skill Plugin System (internal architecture, no pipeline dependency)
- **D-4** — Audit seed data + reconcile grants
- **D-6** — Migration 012: map_entities + map_metadata (no code deps)
- **tmx-enrich** — Add seed NPCs to simplemap.tmx (no code deps)

**After D-6 + tmx-enrich:**
- **G-5** — TMX parser + sync logic + CLI
- **G-6** — Optional auto-sync on server start (after G-5)

**After D-6 + G-0:**
- **G-7** — In-game builder save-on-place persistence
- **G-8** — In-game event config form (after G-7)
- **S-6** — Studio map entity browser (after D-6 only)

**After FOUNDATION GATE passes (G-0 + G-5 done + PM verification):**
- **G-2** — Photographer NPC (also needs G-1)
- **S-4** — NPC Memory Viewer (also needs S-1 merged, which it is)

**After D-5 + G-2 ship:**
- **G-3** — Content Store

**After G-3 ships:**
- **G-4** — Associative Recall + Social Feed

**After G-4 ships:**
- **S-5** — Lovable Feed Integration

---

## Recommended Execution Order

### Wave 1 (parallel — in progress)
| Track | Tasks | Status |
|-------|-------|--------|
| Studio | S-1 (NPC Builder), S-2 (Integrations), S-3 (Dashboard stats) | MERGED — briefs reframed as verify & polish |
| Game | G-0 (Load configs from Supabase) | DONE |
| Game | G-1 (Modular Skill Plugins) | DONE |
| Game | tmx-enrich (Add seed NPCs to simplemap.tmx) | DONE |
| Game | G-5 (TMX parser + sync + CLI) | DONE |
| Game | G-6 (Optional auto-sync on server start) | DONE |
| Game | G-7 (In-game builder save-on-place persistence) | TODO — after D-6 + G-0 |
| Game | G-8 (In-game event config form) | TODO — after G-7 |
| DB | D-4 (Audit seed data + reconcile grants) | TODO |
| DB | D-6 (Migration 012: map_entities + map_metadata) | DONE |

### FOUNDATION GATE — PM verifies pipeline after G-0 + G-5 ship

### Wave 2 (after foundation gate passes)
| Track | Tasks | Status |
|-------|-------|--------|
| Game | G-2 (Photographer NPC + Gemini) | DONE |
| Studio | S-4 (NPC Memory Viewer) | HELD — needs foundation gate |
| Studio | S-6 (Map Entity Browser) | TODO — after D-6 (can start pre-gate) |
| DB | D-5 (Content store schema) | **DONE** — migration 013 ready |

### Wave 3 — UNBLOCKED (D-5 done, G-2 done)
| Track | Tasks |
|-------|-------|
| Game | G-3 (Content Store — apply migration 013 + ContentStore.ts), then G-4 (Social Feed) |
| Studio | S-5 (Lovable Feed Integration, after G-4) |

---

## Briefs

| Task | Brief location | Status |
|------|---------------|--------|
| G-0 | `briefs/cursor/2026-02/TASK-G-0-supabase-config-loading.md` | WRITTEN |
| G-1 | `briefs/cursor/2026-02/TASK-G-1-modular-skill-plugin.md` | WRITTEN |
| G-2 | `briefs/cursor/2026-02/TASK-G-2-photographer-npc.md` | WRITTEN |
| G-3 | `briefs/cursor/2026-02/TASK-G-3-content-store.md` | TO WRITE (D-5 schema done, **UNBLOCKED**) |
| G-4 | TBD (after G-3) | NOT YET |
| S-1 | `briefs/lovable/2026-02/TASK-S-1-npc-builder-ui.md` | REWRITTEN — verify & polish (code merged) |
| S-2 | `briefs/lovable/2026-02/TASK-S-2-integrations-page.md` | REWRITTEN — verify & polish (code merged) |
| S-3 | `briefs/lovable/2026-02/TASK-S-3-dashboard-game-stats.md` | REWRITTEN — verify & polish (code merged) |
| S-4 | `briefs/lovable/2026-02/TASK-S-4-npc-memory-viewer.md` | WRITTEN |
| S-5 | TBD (after G-4) | NOT YET |
| S-6 | `briefs/lovable/2026-02/TASK-S-6-map-entity-browser.md` | TO WRITE |
| G-7 | `briefs/cursor/2026-02/TASK-G-7-builder-persistence.md` | TO WRITE |
| G-8 | `briefs/cursor/2026-02/TASK-G-8-event-config-form.md` | TO WRITE |
| D-4 | Inline (verification, not a code task) | N/A |
| D-5 | `briefs/cursor/2026-02/D-5-content-store-schema.md` + `migrations/013_content_store.sql` | **DONE** |
| D-6 | `briefs/cursor/2026-02/TASK-D-6-migration-012-map-entities.md` | WRITTEN |
| tmx-enrich | `briefs/cursor/2026-02/TASK-tmx-enrich-seed-npcs-in-tmx.md` | WRITTEN |
| G-5 | `briefs/cursor/2026-02/TASK-G-5-tmx-parser-sync-cli.md` | WRITTEN |
| G-6 | `briefs/cursor/2026-02/TASK-G-6-auto-sync-on-server-start.md` | WRITTEN |
