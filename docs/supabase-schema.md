# Supabase Multi-Schema Layout

> Reference for both the game server (open-rpg) and Agent Artel Studio.

---

## Schemas

| Schema | Owner | Purpose |
|--------|-------|---------|
| `game` | Game server (service_role key) | NPC configs, conversation memory, player state, API integrations |
| `public` | Studio (anon/authenticated key) | Studio workflows, executions, activity logs, Studio-specific data (`studio_*` tables) |

---

## Game Schema Tables

### `game.agent_configs`

One row per AI NPC in the game.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Slug ID (e.g. `elder-theron`) |
| `name` | text | Display name |
| `personality` | text | LLM system prompt |
| `graphic` | text | Spritesheet: `male` or `female` |
| `skills` | text[] | Skill names: `move`, `say`, `look`, `emote`, `wait`, plus API skills |
| `spawn` | jsonb | `{ map, x, y }` |
| `behavior` | jsonb | `{ idleInterval, patrolRadius, greetOnProximity }` |
| `model` | jsonb | `{ idle, conversation }` — LLM model IDs |
| `inventory` | text[] | Token item IDs for API skill gating |
| `enabled` | boolean | On/off switch |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto (trigger) |

### `game.api_integrations`

Catalog of API-backed skills available in the game.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Slug ID |
| `name` | text | Display name |
| `skill_name` | text UNIQUE | Function name (e.g. `generate_image`) |
| `category` | text | `api`, `social`, `knowledge` |
| `description` | text | Tooltip text |
| `required_item_id` | text | Token item (e.g. `image-gen-token`) |
| `requires_env` | text[] | Env vars needed (e.g. `GEMINI_API_KEY`) |
| `enabled` | boolean | Show/hide in NPC builder |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto (trigger) |

### `game.agent_memory`

NPC conversation history (read-only from Studio).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto |
| `agent_id` | text | FK to agent_configs.id |
| `role` | text | `user`, `assistant`, `system`, `tool` |
| `content` | text | Message content |
| `metadata` | jsonb | Extra context |
| `importance` | smallint | Priority hint |
| `created_at` | timestamptz | Auto |

### `game.player_state`

Last known player position (read-only from Studio).

| Column | Type | Notes |
|--------|------|-------|
| `player_id` | text PK | Player identifier |
| `name` | text | Display name |
| `map_id` | text | Current map |
| `position_x` | integer | Pixel X |
| `position_y` | integer | Pixel Y |
| `direction` | integer | Facing direction |
| `state_data` | jsonb | Extended state |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto (trigger) |

---

## Grants (Migration 011)

| Role | `agent_configs` | `api_integrations` | `agent_memory` | `player_state` |
|------|----------------|-------------------|----------------|----------------|
| `authenticated` | CRUD | CRUD | SELECT | SELECT |
| `anon` | SELECT | SELECT | SELECT | — |

PostgREST exposes schemas: `public`, `studio`, `game`.

---

## How Studio Queries Game Data

Studio's Supabase client defaults to `public`. To query game tables, always use `.schema('game')`:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Game tables — MUST use .schema('game')
const { data } = await supabase
  .schema('game')
  .from('agent_configs')
  .select('*')
  .order('name');

// Studio tables — use default (public)
const { data } = await supabase
  .from('studio_workflows')
  .select('*');
```

---

## How Game Server Queries

The game server uses the service_role key with `schema: 'game'` set in the client options:

```typescript
client = createClient(url, key, {
  db: { schema: 'game' },
  auth: { autoRefreshToken: false, persistSession: false },
});
```

This makes all `.from()` calls target `game.*` by default.

---

## Migrations

| File | Purpose |
|------|---------|
| `001_agent_memory.sql` | Legacy: agent_memory in public (superseded by 009) |
| `002_player_state.sql` | Legacy: player_state in public (superseded by 009) |
| `009_game_schema.sql` | Creates `game` schema with all game tables, seed data |
| `011_studio_cross_schema_access.sql` | Grants Studio roles access to `game` schema |
