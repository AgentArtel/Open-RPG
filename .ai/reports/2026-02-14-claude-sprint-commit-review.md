# Review: Claude Code Sprint Commit (f986c22)

**Date:** 2026-02-14  
**Commit:** `f986c22` — Update sprint backlog with TMX-to-DB sync tasks (D-6, G-5, G-6)  
**Branch:** `origin/main` (local branch is `pre-mortal`; pull was not run due to uncommitted local changes)

---

## Summary

Claude’s commit updates the orchestrator sprint docs so the TMX-to-DB sync plan is reflected in the backlog, dependency graph, foundation gate, and status. All changes are consistent with the approved plan and project alignment.

---

## Files Changed (3)

| File | Purpose |
|------|--------|
| `.ai/orchestrator/sprints/2026-02-studio-game-alignment/game-sprint.md` | Game-side tasks and “what can start now”; foundation gate now G-0 + G-5 |
| `.ai/orchestrator/sprints/2026-02-studio-game-alignment/master.md` | Master backlog, dependency graph, Wave 1 table, foundation gate, briefs |
| `.ai/orchestrator/status.md` | Cross-project status, known blockers, approved tasks, DB schema note |

*(Note: `.ai/orchestrator/` does not exist on the current `pre-mortal` branch; it is introduced on `main` by this commit. To get these files locally, merge or rebase `main` after resolving local changes.)*

---

## What Claude Updated

1. **New tasks in backlog**
   - **D-6** — Migration 012: map_entities + map_metadata (011-aligned grants).
   - **tmx-enrich** — Add 4 seed NPCs to simplemap.tmx.
   - **G-5** — TMX parser + sync logic + CLI (depends on D-6, tmx-enrich).
   - **G-6** — Optional auto-sync on server start (depends on G-5).

2. **D-5 renumbering**
   - Content store schema is now “migration 013+” so 012 is reserved for map_entities.

3. **Dependency graph**
   - D-6 → G-5, tmx-enrich → G-5, G-5 → G-6, G-5 → FOUNDATION GATE.

4. **Foundation gate**
   - PM verification now requires **G-0 and G-5** (full pipeline: Tiled → DB → Game).

5. **“What can start now”**
   - D-6 and tmx-enrich in parallel (no code deps); then G-5, then G-6.

6. **Constraints**
   - TMX grants (anon=SELECT, authenticated=CRUD, service_role=ALL), TMX never overwrites Studio edits, skeleton agent_configs disabled by default.

7. **Status**
   - Two known blockers (G-0 and G-5); D-6, tmx-enrich, G-5, G-6 listed as approved; pending migration 012 noted.

---

## Coordinate “minor flag” — resolved

Claude’s message said photographer/artist seed in 009 was (200,200) and (350,150), while the plan had (500,200) and (150,400). Checking the repo:

- **`supabase/migrations/009_game_schema.sql`** (and 004): photographer `"x":500,"y":200`, artist `"x":150,"y":400`.

So the **plan’s Phase 0 coordinates already match migration 009**. The “mismatch” was from treating seed as 200,200 / 350,150; the actual seed is 500,200 / 150,400.

**Cursor change:** The TMX plan was updated to state explicitly that Phase 0 coordinates are taken from **current migration 009** (elder-theron 300,250; test-agent 450,350; photographer 500,200; artist 150,400) and to reference `009_game_schema.sql` as source of truth. No XML or coordinates were changed; only the written intent was clarified.

---

## Verdict

- **Sprint updates:** Correct and aligned with the TMX-to-DB sync plan (D-6, tmx-enrich, G-5, G-6 in Wave 1, foundation gate G-0 + G-5).
- **Coordinate flag:** Resolved by documenting that Phase 0 uses 009 seed coordinates (500,200 and 150,400 for photographer and artist).

**Next step for you:** When ready, pull `main` (after committing or stashing local changes to `docs/supabase-schema.md` and any conflicting untracked files) to get the `.ai/orchestrator/` sprint and status files. Cursor can implement from the updated plan and backlog.
