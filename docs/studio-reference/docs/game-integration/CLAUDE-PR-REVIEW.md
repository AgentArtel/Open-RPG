# Claude Code PRs — Pull & Review Summary

**Date:** 2026-02-14  
**Branches reviewed:**  
- Game: `origin/claude/game-schema-studio-access` (Open-RPG)  
- Studio: `studio/claude/studio-schema-npc-integration` (Agent-Artel-studio)

---

## 1. Merge status: **not merged**

| Repo | Claude's branch | Merged into main? |
|------|------------------|-------------------|
| **Open-RPG** (game) | `claude/game-schema-studio-access` | **No** — 1 commit ahead of main |
| **Agent-Artel-studio** (Studio) | `claude/studio-schema-npc-integration` | **No** — 1 commit ahead of main |

Both PRs are open. Nothing from these branches is in `main` yet.

---

## 2. Game repo (Open-RPG) — what’s on Claude’s branch

**Commit:** `Game schema and Studio cross-schema access`

**Files changed vs main:**
- `supabase/migrations/009_game_schema.sql` (add)
- `supabase/migrations/011_studio_cross_schema_access.sql` (add)
- `docs/supabase-schema.md` (add)
- `src/config/supabase.ts` (add `db: { schema: 'game' }`)

**Note:** This repo’s `main` already has 009, 011, and game schema client config (from an earlier Cursor commit). So the **content** is aligned; Claude’s branch is an alternate way of adding the same idea. Merging this PR is safe and may only add or tweak docs; migrations and client config likely match what’s already on main.

**Recommendation:** Merge the game PR if you want Claude’s exact doc wording and any small config/doc differences; otherwise you can leave it since main already has the schema and Studio access.

---

## 3. Studio repo — what’s on Claude’s branch (recommended)

**Commit:** `Wire Studio to game schema: NPC Builder, Integrations, dashboard stats`

**Files changed vs Studio main:**

| File | What it does |
|------|----------------|
| `src/lib/gameSchema.ts` | **New.** `gameDb()` helper: `supabase.schema('game')`. Single place for game schema + fixes TypeScript. |
| `src/pages/NPCs.tsx` | **Updated.** Uses `gameDb()` for all agent_configs / api_integrations. Renamed export to `NpcBuilder`. |
| `src/components/npcs/NPCCard.tsx` | **Updated.** (No schema calls; UI only.) |
| `src/components/npcs/NPCFormModal.tsx` | **Updated.** (Form logic; no direct Supabase.) |
| `src/pages/Integrations.tsx` | **New.** Full CRUD for `game.api_integrations` via `gameDb()`. |
| `src/pages/Dashboard.tsx` | **Updated.** Adds game stats row: Active NPCs, Player Messages, API Integrations, Online Players — all via `gameDb()`. |
| `src/App.tsx` | **Updated.** Routes for `npcs` and `integrations`. |
| `src/components/ui-custom/Sidebar.tsx` | **Updated.** NPCs (Users) and Integrations (Puzzle) nav items. |
| `docs/game-integration/NPC-BUILDER-PLAN.md` | **New.** Canonical NPC Builder spec. |
| `docs/game-integration/README.md` | **Updated.** Link to plan. |
| `.lovable/plan.md` | **Updated.** Lovable plan. |

**Review of code (from branch content):**

- **gameSchema.ts** — Correct. `gameDb = () => supabase.schema('game')`. Comment says to use this or `.schema('game')` for game tables.
- **NPCs.tsx** — All reads/writes use `gameDb().from('agent_configs')` or `gameDb().from('api_integrations')`. No bare `supabase.from()` for game tables. Query keys `['game-agent-configs']` etc.
- **Integrations.tsx** — All access via `gameDb().from('api_integrations')`. CRUD and list look correct.
- **Dashboard.tsx** — Studio tables still use `supabase.from('studio_*')`. Game stats use `gameDb().from('agent_configs')`, `gameDb().from('agent_memory')`, etc. with count queries. Correct split.

**Verdict:** Claude’s Studio branch is **better** than the current Studio main for game integration: one `gameDb()` helper, full Integrations page, dashboard game stats, and consistent use of the game schema. Safe to merge.

---

## 4. Comparison: our ref vs Claude’s Studio branch

| Aspect | Our `docs/studio-reference` (current) | Claude’s Studio branch |
|--------|--------------------------------------|-------------------------|
| Game schema access | `supabase.schema('game').from(...)` in NPCs.tsx | `gameDb().from(...)` everywhere |
| TypeScript | Can error if types don’t have `game` schema | `gameDb()` avoids schema in generic |
| Integrations page | Not in our ref | Full CRUD in branch |
| Dashboard game stats | Not in our ref | In branch |
| NPC Builder | Yes (our schema fix) | Yes (with gameDb) |

Claude’s branch is the preferred version for Studio: same behavior, plus Integrations, dashboard stats, and a cleaner pattern.

---

## 5. Recommended next steps

1. **Merge Studio PR**  
   Merge `claude/studio-schema-npc-integration` into Agent-Artel-studio `main`. That gives you gameDb, NPC Builder, Integrations, and dashboard stats in the canonical Studio repo.

2. **Update our game repo’s Studio reference**  
   From the game repo (open-rpg):  
   `git fetch studio main`  
   `git subtree pull --prefix=docs/studio-reference studio main --squash`  
   (after Studio PR is merged) so `docs/studio-reference` matches the merged Studio code.

3. **Game repo PR (optional)**  
   Merge `claude/game-schema-studio-access` into Open-RPG main if you want Claude’s exact docs/config; otherwise keep using current main since it already has 009, 011, and game schema.

4. **Lovable**  
   After the Studio PR is merged, Lovable should pull latest `main` and work from that (gameDb, Integrations, Dashboard already in place).

---

## 6. One-line summary

**Claude’s work is not merged yet. His Studio branch is the version to use: merge that PR first, then subtree-pull Studio into the game repo’s `docs/studio-reference` so we stay in sync.**
