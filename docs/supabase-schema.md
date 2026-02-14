# Supabase Schema Contract

> **Audience:** Game server (`src/`), frontend/Studio (Lovable / Agent Artel Studio), and future integrations.
>
> **Auth model:** The game server uses the **service_role** key (bypasses RLS). Frontend/Studio should use anon keys + RLS policies when added.

---

## Schema Location

All game server tables, functions, and RPCs live in the **`game`** schema, not `public`.

**Migration:** [`supabase/migrations/009_game_schema.sql`](../supabase/migrations/009_game_schema.sql)

### Setup (required after running migration 009)

1. Go to **Dashboard -> Project Settings -> API (Data API)** and add **`game`** to **Exposed schemas** (keep `public` if needed).
2. **Persist the schema list** so PostgREST keeps serving `game` after restarts. In the Supabase **SQL Editor** run:
   ```sql
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, game';
   NOTIFY pgrst, 'reload schema';
   ```
   Without this, you may see `Invalid schema: game` after the next PostgREST or game server restart.

The Supabase client in [`src/config/supabase.ts`](../src/config/supabase.ts) is configured with `db: { schema: 'game' }`, so every `.from()` and `.rpc()` call automatically targets the `game` schema without changes at call sites.

### Legacy `public` tables (001-008)

Migrations 001-008 created tables in the `public` schema. These are **no longer used** by the game server. You can drop them manually or keep them for reference. Data migration from `public` to `game` is not automatic; copy rows manually if needed.

### Skill architecture

- **Game-world skills** (move, say, look, emote, wait) run in-process on the game server. No edge functions involved.
- **API-backed skills** (e.g. generate_image, voice, search) will route to Supabase Edge Functions. Flow: game server receives tool call -> HTTP to edge function -> edge calls external API -> result back to game server. API keys and integration logic live on the edge.

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

**Migration:** [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql) (originally `001_agent_memory.sql` in public)

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

**Migration:** [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql) (originally `002_player_state.sql` in public)

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
| `inventory`   | `text[]`      | `'{}'`                                                                           | Item IDs the NPC spawns with; tokens enable API integrations (see `api_integrations`) |
| `created_at`  | `timestamptz` | `now()`                                                                          | Row creation time                                                  |
| `updated_at`  | `timestamptz` | `now()`                                                                          | Auto-updated on every UPDATE                                       |

**Trigger:** `agent_configs_updated` calls `update_timestamp()` before each UPDATE.

**Seed data:** Migration 003 includes one proof NPC (Elder Theron) matching `src/config/agents/elder-theron.yaml`.

**Migration:** [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql) (consolidates 003, 004, 005 from public into one table definition).

**RPC:** `game.get_agent_configs_for_map(p_map_id text)` — returns rows where `enabled = true` and `spawn->>'map' = p_map_id`. The game server uses this for per-map loading. Defined in [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql).

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

**Choosing skills:** Game skills (move, say, look, emote, wait) plus API-backed skills from the `api_integrations` table. For an integration to work, add its `skill_name` to `agent_configs.skills` and its `required_item_id` to `agent_configs.inventory` so the NPC spawns with the token.

---

### `api_integrations` — Catalog of API-Backed Skills

Lists the API integrations available in the game. When adding skills to an agent (e.g. in Studio), you choose from game skills plus these integrations. **Tokens are literal items in the NPC's inventory** that enable use of an integration: the NPC must have `required_item_id` in their `inventory` to use that skill.

| Column            | Type          | Default     | Notes                                                                 |
| ----------------- | ------------- | ----------- | --------------------------------------------------------------------- |
| `id`              | `text`        | —           | Primary key, e.g. `image-generation`                                  |
| `name`            | `text`        | —           | Display name for Studio UI, e.g. "Image Generation"                  |
| `description`     | `text`        | `''`        | For Studio UI tooltips                                                |
| `skill_name`      | `text`        | —           | The skill this integration powers, e.g. `generate_image`             |
| `required_item_id`| `text`        | —           | Item ID that grants access (must exist in game DB), e.g. `image-gen-token` |
| `requires_env`    | `text[]`      | `'{}'`      | Env vars needed at runtime, e.g. `{GEMINI_API_KEY}`                   |
| `category`        | `text`        | `'api'`     | `api` \| `social` \| `knowledge`                                      |
| `enabled`         | `boolean`     | `true`      | When false, hide from Studio / disable                               |
| `created_at`      | `timestamptz` | `now()`     | Row creation time                                                     |
| `updated_at`      | `timestamptz` | `now()`     | Auto-updated on every UPDATE                                          |

**Trigger:** `api_integrations_updated` calls `update_timestamp()` before each UPDATE.

**Seed:** Migration 006 inserts one row for image generation (skill `generate_image`, token `image-gen-token`).

**Migration:** [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql) (originally `006_api_integrations.sql` in public).

---

## Shared Functions

### `game.update_timestamp()`

PL/pgSQL trigger function defined in [`009_game_schema.sql`](../supabase/migrations/009_game_schema.sql). Sets `NEW.updated_at = now()` before UPDATE. Reused by `player_state`, `agent_configs`, and `api_integrations` tables in the `game` schema.

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
| `skill_definitions` | Full metadata for all skills (parameters, schema) — optional  |
| `items`             | Game items catalog in DB (tokens still defined in code for now)|
| `map_configs`       | Per-map tool availability and context restrictions              |
| `quest_state`       | Quest progress tracking per player                             |

**Current state:** `agent_configs` (with `inventory`) and `api_integrations` define which skills/APIs exist and which token items enable them. Token items themselves are still defined in code (`main/database/items/`); NPC inventory is stored as item IDs in `agent_configs.inventory` and granted at spawn.

---

## Notes for Frontend/Studio Integration

- **Agent Artel Studio** (Lovable-built frontend) will eventually read/write `agent_configs` via Supabase client with anon key + RLS policies.
- RLS policies are **not yet defined** — the game server uses `service_role` which bypasses RLS.
- When Studio wiring is implemented, add appropriate RLS policies for the `anon` and `authenticated` roles.
- The Studio can use the column schemas above as the contract for building config UIs.
