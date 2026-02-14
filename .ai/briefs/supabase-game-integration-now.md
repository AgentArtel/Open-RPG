# Proposal Brief: Supabase–Game Integration Now (Database-First)

**From:** Cursor (Implementation Specialist)
**To:** Human PM (and Claude Code for tasking)
**Date:** 2026-02-14
**Context:** Agent Artel Studio will manage the game via the same Supabase project. To avoid rework and keep one source of truth, we should move game config onto Supabase **now** while we're building agents, skills, and items — and prove it with one AI NPC.
**Status:** PROPOSAL — Requesting PM review and approval to prioritize DB integration; frontend wiring is explicitly a separate scope.

> PM-directed cross-boundary edit (2026-02-14): Created by Cursor under `.ai/briefs/`
> per PM approval of Supabase agent config sprint integration plan.

---

## Summary

Propose a **database-first integration** of the game with Supabase: add the schema and game-side loading so that **one AI NPC is fully driven from Supabase**, and begin migrating other legacy (file-based) config to the same DB. Scope is **database and game server only**; wiring the Lovable frontend (Agent Artel Studio) to that database is a separate agent's task. Goal: establish Supabase as the source of truth for config as we develop, so the Studio can later connect to an already-working data model.

---

## Why Now Instead of Later

- We're **already creating** agents, skills, and items; putting them in the DB from the start avoids a big "migrate everything later" step and duplicate sources of truth.
- **One AI NPC in the DB** gives a clear, small proof: create/update a row -> game loads it -> we see it in Supabase. No frontend required for this proof.
- **Frontend wiring** (Studio UI talking to Supabase) can be done in parallel or after, by another agent; this work only ensures the game reads from Supabase and that the schema is documented.

---

## Scope (In Scope / Out of Scope)

**In scope (this initiative):**

- **Schema:** Add Supabase tables for config the game currently reads from files (starting with **agent configs**; later, skills metadata and items as we migrate).
- **Game server:** Teach the game to **load from Supabase when configured**, with a **fallback to existing YAML/files** when Supabase is unavailable (e.g. local dev).
- **Proof:** At least **one AI NPC** fully defined in the database; game loads it, spawns it, and we can inspect/change it in Supabase (e.g. Supabase Studio or SQL). No Studio frontend required for this.
- **Migration path:** Document and execute a path to move **other legacy config** (additional agents, then skills metadata, items, etc.) from files into Supabase over time, so we don't block current Sprint 5 work but we stop adding new file-based config that we'll have to migrate later.

**Out of scope (other agent's task):**

- **Frontend / Agent Artel Studio:** Building or wiring the Lovable UI to Supabase. That team/agent will consume the same schema and env; our job is to make the DB and game the source of truth.
- **Auth / RLS:** Can be added later when the Studio is wired; for this phase, game uses service role, and the Studio can use anon key (or RLS when they implement it).

---

## Current State vs Target

| Concern | Current (legacy) | Target (this initiative) |
|---------|-------------------|--------------------------|
| Agent configs | YAML in `src/config/agents/*.yaml`; `AgentManager.loadConfigs()` reads from disk only | Table `agent_configs` in Supabase; game loads from DB when Supabase is configured; fallback to YAML when not |
| Agent memory | Already in Supabase (`agent_memory`) | No change |
| Player state | Already in Supabase (`player_state`) | No change |
| Skills | Code + YAML skill names; no DB table yet | No change in this phase; optional later: skills metadata table for Studio display |
| Items | RPGJS/database files if any | No change in this phase; optional later: items in Supabase when we standardize |

---

## Deliverables (Database and Game Only)

1. **Migration:** `supabase/migrations/003_agent_configs.sql` defining `agent_configs` with columns aligned to `AgentConfig` (id, name, graphic, personality, model jsonb, skills array, spawn jsonb, behavior jsonb, created_at, updated_at). Optional: trigger or function for `updated_at`.
2. **Game loading:** In `AgentManager`, a "load from Supabase" path: if `getSupabaseClient()` is non-null, fetch rows from `agent_configs`, map each row to `AgentConfig`, and call existing `registerAgent(config)`; if Supabase is null or query fails, keep using `loadConfigs('src/config/agents')` so local dev without Supabase still works.
3. **Proof:** One AI NPC (e.g. `elder-theron` or a dedicated `studio-test-npc`) exists only in Supabase (row in `agent_configs`). Game started with Supabase env loads that NPC; we can edit the row in Supabase and see behavior change after restart (or after adding a reload mechanism later). No Studio UI required.
4. **Docs:** A short doc (e.g. in `docs/` or next to migrations) listing tables used by the game and their purpose, so the frontend agent knows the contract. Optionally: one-paragraph "Studio integration" note that wiring the frontend is out of scope here.

---

## Migration of Legacy Config (Phased)

- **Phase 1 (this initiative):** Agent configs. Add `agent_configs`; game loads from DB with YAML fallback; one NPC in DB as proof.
- **Phase 2 (follow-up):** Migrate remaining YAML agents into `agent_configs` (manual or script), then remove or deprecate loading from `src/config/agents/` when Supabase is configured.
- **Later:** Skills metadata, items, workflows, builder placements — migrate when those features are ready; schema and "game reads from Supabase" pattern will already be in place.

---

## Success Criteria

- [ ] Migration `003_agent_configs.sql` exists and is applied to the project's Supabase instance.
- [ ] With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, the game loads at least one AI NPC from `agent_configs` and spawns it; no YAML required for that NPC.
- [ ] With Supabase env unset or DB unavailable, the game still runs using existing YAML (no regression).
- [ ] One AI NPC is editable in Supabase (e.g. name or personality); after game restart, the change is reflected in-game.
- [ ] Schema/doc is in repo so the frontend agent can rely on it when wiring the Studio.

---

## Dependencies and Ordering

- **Depends on:** Existing Supabase client and migrations (`001_agent_memory`, `002_player_state`); no new dependencies.
- **Blocks:** Nothing; can run alongside Sprint 5 (e.g. TASK-018a/018). Prefer doing this **before** the Studio frontend is wired so the frontend has a stable schema to target.
- **Owner:** Cursor (implementation). Task creation/decomposition can be done by Claude Code after PM approval.

---

## Asks for the PM

1. **Approve** this scope (database + game only; one AI NPC in DB; frontend wiring out of scope).
2. **Confirm** that wiring the Lovable frontend to Supabase is assigned to another agent/task so we don't blur boundaries.
3. **Confirm** priority: start DB integration now so we're "Supabase-first" as we add agents/skills/items, with legacy migration phased as above.
