# Supabase Schema Contract

> **Audience:** Game server (`src/`), frontend/Studio (Lovable / Agent Artel Studio), and future integrations.
>
> **Auth model:** The game server uses the **service_role** key (bypasses RLS). Frontend/Studio should use anon keys + RLS policies when added.

---

## Tables

### `agent_memory` — NPC Conversation History

| Column       | Type          | Default                 | Notes                                          |
| ------------ | ------------- | ----------------------- | ---------------------------------------------- |
| `id`         | `uuid`        | `gen_random_uuid()`     | Primary key                                    |
| `agent_id`   | `text`        | —                       | Which NPC this message belongs to              |
| `role`       | `text`        | —                       | `user`, `assistant`, `system`, or `tool`       |
| `content`    | `text`        | —                       | Message content                                |
| `metadata`   | `jsonb`       | `'{}'`                  | Arbitrary metadata (e.g. `playerId`)           |
| `importance` | `smallint`    | `5`                     | 1–10 scale for memory prioritization           |
| `created_at` | `timestamptz` | `now()`                 | When the message was stored                    |

**Index:** `idx_agent_memory_agent_time` on `(agent_id, created_at DESC)` — optimizes fetching recent messages per agent.

**Migration:** [`supabase/migrations/001_agent_memory.sql`](../supabase/migrations/001_agent_memory.sql)

---

### `player_state` — Player Position Persistence

| Column       | Type          | Default  | Notes                                     |
| ------------ | ------------- | -------- | ----------------------------------------- |
| `player_id`  | `text`        | —        | Primary key                               |
| `name`       | `text`        | —        | Player display name                       |
| `map_id`     | `text`        | —        | Which map the player was on               |
| `position_x` | `integer`     | —        | X coordinate                              |
| `position_y` | `integer`     | —        | Y coordinate                              |
| `direction`  | `smallint`    | `0`      | Facing direction                          |
| `state_data` | `jsonb`       | `'{}'`   | Arbitrary player state (variables, flags) |
| `created_at` | `timestamptz` | `now()`  | Row creation time                         |
| `updated_at` | `timestamptz` | `now()`  | Auto-updated on every UPDATE              |

**Trigger:** `player_state_updated` calls `update_timestamp()` before each UPDATE.

**Migration:** [`supabase/migrations/002_player_state.sql`](../supabase/migrations/002_player_state.sql)

---

### `agent_configs` — AI NPC Configuration (Database-First)

The game loads NPC configs from this table when Supabase env vars are set. **Only rows for the current map** are loaded (filter by `spawn->>'map'` = map id) and **only when `enabled` is true**. Set `enabled = false` to turn an NPC off without deleting it. Falls back to YAML files in `src/config/agents/` when Supabase is unavailable.

| Column        | Type          | Default                                                                          | Notes                                                              |
| ------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`          | `text`        | —                                                                                | Primary key, matches YAML `id` field                               |
| `name`        | `text`        | —                                                                                | Display name shown above the NPC sprite                            |
| `graphic`     | `text`        | —                                                                                | RPGJS spritesheet graphic ID (e.g. `male`, `female`)               |
| `personality` | `text`        | —                                                                                | System prompt personality block (multi-line)                       |
| `model`       | `jsonb`       | `'{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'`        | LLM model selection: `idle` for ambient ticks, `conversation` for player interactions |
| `skills`      | `text[]`      | `'{move,say,look,emote,wait}'`                                                   | Array of skill names the NPC can use                               |
| `spawn`       | `jsonb`       | —                                                                                | `{"map":"simplemap","x":300,"y":250}` — map ID and tile coords    |
| `behavior`    | `jsonb`       | `'{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}'`              | Behavioral tuning parameters                                       |
| `enabled`     | `boolean`     | `true`                                                                           | When false, this NPC is not loaded or spawned (toggle on/off)     |
| `created_at`  | `timestamptz` | `now()`                                                                          | Row creation time                                                  |
| `updated_at`  | `timestamptz` | `now()`                                                                          | Auto-updated on every UPDATE                                       |

**Trigger:** `agent_configs_updated` calls `update_timestamp()` before each UPDATE.

**Seed data:** Migration 003 includes one proof NPC (Elder Theron) matching `src/config/agents/elder-theron.yaml`.

**Migrations:** [`003_agent_configs.sql`](../supabase/migrations/003_agent_configs.sql), [`004_agent_configs_enabled.sql`](../supabase/migrations/004_agent_configs_enabled.sql) (adds `enabled` + RPC below).

**RPC (from 004):** `get_agent_configs_for_map(p_map_id text)` — returns rows where `enabled = true` and `spawn->>'map' = p_map_id`. The game server uses this for per-map loading.

#### JSON column schemas

**`model`:**
```json
{
  "idle": "kimi-k2-0711-preview",
  "conversation": "kimi-k2-0711-preview"
}
```

**`spawn`:**
```json
{
  "map": "simplemap",
  "x": 300,
  "y": 250
}
```

**`behavior`:**
```json
{
  "idleInterval": 20000,
  "patrolRadius": 3,
  "greetOnProximity": true
}
```

---

## Shared Functions

### `update_timestamp()`

PL/pgSQL trigger function defined in `002_player_state.sql`. Sets `NEW.updated_at = now()` before UPDATE. Reused by both `player_state` and `agent_configs` tables.

---

## Extensions

- **pgvector** (`vector`): Enabled in `001_agent_memory.sql` for future embedding-based memory retrieval.

---

## Game Server Load Order

**Per-map (spawnAgentsOnMap):**
- Load only configs for the current map: `agent_configs` where `enabled = true` and `spawn->>'map' = mapId`.
- If Supabase client missing or query fails → load all YAML once, then spawn agents for this map.

**Builder (spawnAgentAt):**
- If agent not registered → fetch that row by `id` and `enabled = true` from Supabase; else load all YAML once, then spawn.

**Environment variables required for Supabase path:**
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)

Without these, the game runs entirely from YAML — no errors, no degradation.

---

## Future Phases (Not Yet Implemented)

These tables may be added in later migrations as the system grows:

| Planned Table       | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `skill_definitions` | Metadata for available skills (name, description, parameters)  |
| `items`             | Game items / tokens (e.g. `ImageGenToken` for API gating)      |
| `map_configs`       | Per-map tool availability and context restrictions              |
| `npc_inventory`     | Agent inventory / equipped items (skill-gating tokens)         |
| `quest_state`       | Quest progress tracking per player                             |

The `agent_configs` table is the first step toward a fully database-driven game world. Skills, items, and objects remain in TypeScript code and YAML configs for now.

---

## Notes for Frontend/Studio Integration

- **Agent Artel Studio** (Lovable-built frontend) will eventually read/write `agent_configs` via Supabase client with anon key + RLS policies.
- RLS policies are **not yet defined** — the game server uses `service_role` which bypasses RLS.
- When Studio wiring is implemented, add appropriate RLS policies for the `anon` and `authenticated` roles.
- The Studio can use the column schemas above as the contract for building config UIs.
