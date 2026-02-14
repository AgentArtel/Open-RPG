## TASK-018b: Supabase Agent Config (Database-First)

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-as-Identity — Database Integration)
- **Type**: Create + Modify
- **Depends on**: TASK-012 (Agent Memory), TASK-013 (Player State), TASK-014 (AgentManager)
- **Blocks**: None (recommended order places 018b before 018a; 018a/018 unchanged)
- **Brief**: `.ai/briefs/supabase-game-integration-now.md`

> PM-directed cross-boundary edit (2026-02-14): Created by Cursor under `.ai/tasks/`
> per PM approval of Supabase agent config sprint integration plan.

### Context

Agent configs currently load from YAML files only (`AgentManager.loadConfigs()` reads
`src/config/agents/*.yaml` from disk). Agent Artel Studio will manage the game via the
same Supabase project. Moving agent config to Supabase **now** establishes one source of
truth and avoids a large "migrate everything later" step.

The Supabase client singleton (`src/config/supabase.ts`) and two existing migrations
(`001_agent_memory.sql`, `002_player_state.sql`) already provide the pattern: if env vars
are set, use Supabase; otherwise fall back gracefully.

### Objective

Game loads agent config from Supabase when configured; one AI NPC fully defined in the
database; YAML fallback when Supabase is unavailable. Schema documented so the frontend
agent (Agent Artel Studio / Lovable) can rely on the contract.

### Specifications

**Migration (`supabase/migrations/003_agent_configs.sql`):**

Table `agent_configs` with columns aligned to `AgentConfig` in `src/agents/core/types.ts`:

```sql
create table if not exists agent_configs (
  id          text        primary key,   -- matches AgentConfig.id
  name        text        not null,      -- display name above sprite
  graphic     text        not null,      -- RPGJS spritesheet graphic ID
  personality text        not null,      -- system prompt personality block
  model       jsonb       not null default '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
  skills      text[]      not null default '{move,say,look,emote,wait}',
  spawn       jsonb       not null,      -- { "map": "...", "x": ..., "y": ... }
  behavior    jsonb       not null default '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

Reuse the `update_timestamp()` trigger function from `002_player_state.sql`:

```sql
drop trigger if exists agent_configs_updated on agent_configs;
create trigger agent_configs_updated
  before update on agent_configs
  for each row execute function update_timestamp();
```

**Game loading (`src/agents/core/AgentManager.ts`):**

Add a new method (e.g. `loadConfigsFromSupabase()`) that:

1. Calls `getSupabaseClient()` — if null, return false (caller falls back to YAML).
2. Fetches all rows from `agent_configs`.
3. Maps each row to `AgentConfig` using a `rowToAgentConfig()` helper (validates required fields; skips invalid rows with a warning).
4. Calls `registerAgent(config)` for each valid config.
5. Returns true on success.

Modify the startup path (`spawnAgentsOnMap` / wherever `loadConfigs` is called):

```
if (!configsLoaded) {
  const loaded = await loadConfigsFromSupabase()
  if (!loaded) {
    await loadConfigs('src/config/agents')  // YAML fallback
  }
}
```

On Supabase query failure, log a warning and fall back to YAML (never crash).

**Proof:**

One AI NPC (e.g. `studio-test-npc` or `elder-theron`) exists as a row in `agent_configs`.
Game started with Supabase env vars loads that NPC from the database, spawns it, and
behavior matches the DB row. Editing the row in Supabase (e.g. changing personality) and
restarting the game reflects the change.

**Schema doc:**

Short doc (e.g. `docs/supabase-schema.md` or next to migrations) listing all tables used
by the game (`agent_memory`, `player_state`, `agent_configs`) with purpose, columns, and
a note that frontend/Studio wiring is out of scope for this phase.

### Files Summary

**New files:**

| File | Purpose |
|------|---------|
| `supabase/migrations/003_agent_configs.sql` | Migration: `agent_configs` table |
| `docs/supabase-schema.md` (or similar) | Schema contract doc for game + Studio |

**Modified files:**

| File | Change |
|------|--------|
| `src/agents/core/AgentManager.ts` | Add `loadConfigsFromSupabase()` + `rowToAgentConfig()`; modify startup to try Supabase first, YAML fallback |

### Acceptance Criteria

- [ ] Migration `003_agent_configs.sql` exists and can be applied to the project's Supabase instance
- [ ] With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, the game loads at least one AI NPC from `agent_configs` and spawns it; no YAML required for that NPC
- [ ] With Supabase env unset or DB unavailable, the game still runs using existing YAML (no regression)
- [ ] One AI NPC is editable in Supabase (e.g. name or personality); after game restart, the change is reflected in-game
- [ ] `rowToAgentConfig()` validates required fields and skips invalid rows with a warning (never crashes)
- [ ] Schema/contract doc is in repo so the frontend agent can rely on it when wiring the Studio
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes (or pre-existing errors only)
- [ ] Agent errors don't crash the game server

### Do NOT

- Add frontend/Studio wiring (out of scope; separate agent's task)
- Add auth/RLS in this phase (game uses service role; Studio adds RLS when they implement it)
- Change skills or items schema yet (deferred to later phases)
- Migrate all YAML agents into Supabase in this task (one NPC proof is sufficient)
- Add new npm dependencies (existing `@supabase/supabase-js` is sufficient)

### Reference Documents

- `.ai/briefs/supabase-game-integration-now.md` — full proposal brief with scope and phased migration
- `src/config/supabase.ts` — Supabase client singleton (`getSupabaseClient()`)
- `src/agents/core/types.ts` — `AgentConfig` interface definition
- `src/agents/core/AgentManager.ts` — current `loadConfigs()` and `parseAgentConfig()`
- `supabase/migrations/001_agent_memory.sql` — migration pattern reference
- `supabase/migrations/002_player_state.sql` — migration pattern + `update_timestamp()` trigger
- `.ai/idea/06-supabase-persistence.md` — Supabase persistence idea doc
- `.ai/idea/11-context-rendering-shared-db.md` — shared Supabase for ecosystem

### Handoff Notes

**Implemented 2026-02-14 (cursor).** Delivered:

- **003_agent_configs.sql**: Table `agent_configs` with columns aligned to `AgentConfig`; trigger `agent_configs_updated`; seed row `elder-theron`.
- **004_agent_configs_enabled.sql**: Column `enabled boolean NOT NULL DEFAULT true`; RPC `get_agent_configs_for_map(p_map_id)`; seeds for `test-agent`, `photographer`, `artist` (all `on conflict (id) do nothing`).
- **AgentManager.ts**: Supabase-first, **per-map** load: `loadConfigsFromSupabaseForMap(mapId)` calls RPC and registers only configs for that map; `loadConfigFromSupabaseById(configId)` for builder `spawnAgentAt`. YAML fallback when client null or query fails; `configsLoadedFromYaml` tracks YAML path. `rowToAgentConfig()` validates and skips invalid rows with a warning.
- **docs/supabase-schema.md**: Contract for `agent_memory`, `player_state`, `agent_configs` (incl. `enabled` and RPC); load-order summary; future phases note.

**Verified**: With Supabase env set, game loads 4 AI NPCs for simplemap (elder-theron, test-agent, photographer, artist) from DB and spawns them; toggling `enabled` in DB disables load. With env unset, YAML fallback works. Build and tsc (pre-existing errors only) pass.
