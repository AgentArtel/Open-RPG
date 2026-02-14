-- 009_game_schema.sql
-- Isolate all game server tables, functions, triggers, and seeds in a dedicated
-- "game" schema. The Supabase client is configured with db: { schema: 'game' }
-- so every .from() and .rpc() call hits this schema automatically.
--
-- Migrations 001–008 created objects in "public". Those remain untouched;
-- the game server no longer reads from them once this migration is applied
-- and the schema is exposed in the Supabase Dashboard.
--
-- IMPORTANT: After running this migration, go to
--   Dashboard → Project Settings → API → Exposed schemas
-- and add "game" to the list so PostgREST can serve it.

-- =========================================================================
-- 1. Create the schema
-- =========================================================================

create schema if not exists game;

comment on schema game is
  'Isolated game server schema. All tables, functions, and triggers used by '
  'the RPGJS game server live here. Public schema objects (001–008) are legacy.';

-- =========================================================================
-- 2. Grants — service_role only (game server uses service_role key)
-- =========================================================================

grant usage on schema game to service_role;
grant all on all tables in schema game to service_role;
grant execute on all routines in schema game to service_role;
grant all on all sequences in schema game to service_role;
-- Future objects created in game schema are also accessible
alter default privileges in schema game grant all on tables to service_role;
alter default privileges in schema game grant execute on routines to service_role;
alter default privileges in schema game grant all on sequences to service_role;

-- =========================================================================
-- 3. Shared function: update_timestamp()  (from 002)
-- =========================================================================

create or replace function game.update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================================
-- 4. Tables
-- =========================================================================

-- 4a. agent_memory (from 001) -------------------------------------------

create table if not exists game.agent_memory (
  id         uuid          primary key default gen_random_uuid(),
  agent_id   text          not null,
  role       text          not null check (role in ('user', 'assistant', 'system', 'tool')),
  content    text          not null,
  metadata   jsonb         not null default '{}',
  importance smallint      not null default 5,
  created_at timestamptz   not null default now()
);

create index if not exists idx_agent_memory_agent_time
  on game.agent_memory (agent_id, created_at desc);

comment on table game.agent_memory is
  'Stores per-agent conversation history for AI NPCs. Each row is one message '
  '(user, assistant, system, or tool).';

-- 4b. player_state (from 002) -------------------------------------------

create table if not exists game.player_state (
  player_id   text        primary key,
  name        text,
  map_id      text,
  position_x  integer,
  position_y  integer,
  direction   smallint    default 0,
  state_data  jsonb       default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists player_state_updated on game.player_state;
create trigger player_state_updated
  before update on game.player_state
  for each row execute function game.update_timestamp();

comment on table game.player_state is
  'Stores per-player position and state so players resume where they left off. '
  'Upserted on disconnect, loaded on connect. Do NOT store secrets in state_data.';

-- 4c. agent_configs (from 003 + 004 + 005) ------------------------------

create table if not exists game.agent_configs (
  id          text        primary key,
  name        text        not null,
  graphic     text        not null,
  personality text        not null,
  model       jsonb       not null default '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
  skills      text[]      not null default '{move,say,look,emote,wait}',
  spawn       jsonb       not null,
  behavior    jsonb       not null default '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}',
  enabled     boolean     not null default true,
  inventory   text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists agent_configs_updated on game.agent_configs;
create trigger agent_configs_updated
  before update on game.agent_configs
  for each row execute function game.update_timestamp();

comment on table game.agent_configs is
  'Declarative AI NPC configuration. Each row drives one agent: personality, model selection, '
  'skills, spawn location, and behavior tuning. Game loads from this table when Supabase is '
  'configured; falls back to YAML files in src/config/agents/ otherwise.';

comment on column game.agent_configs.enabled is
  'When true, this NPC is loaded and spawned on its map. Set to false to disable without deleting.';

comment on column game.agent_configs.inventory is
  'Item IDs the NPC spawns with (e.g. image-gen-token). Tokens in inventory enable API integrations; '
  'match required_item_id in api_integrations. Game grants these via addItem() in onInit.';

-- 4d. api_integrations (from 006) ---------------------------------------

create table if not exists game.api_integrations (
  id               text        primary key,
  name             text        not null,
  description      text        default '',
  skill_name       text        not null,
  required_item_id text        not null,
  requires_env     text[]      not null default '{}',
  category         text        not null default 'api',
  enabled          boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists api_integrations_updated on game.api_integrations;
create trigger api_integrations_updated
  before update on game.api_integrations
  for each row execute function game.update_timestamp();

comment on table game.api_integrations is
  'Catalog of API-backed skills in the game. When adding skills to an agent, choose from game skills '
  'plus these integrations. The required_item_id is the token item (in main/database/items/); the NPC '
  'must have that item in inventory to use the skill. Studio can list this table for dropdowns.';

-- =========================================================================
-- 5. RPC: get_agent_configs_for_map (from 004)
-- =========================================================================

create or replace function game.get_agent_configs_for_map(p_map_id text)
returns setof game.agent_configs
language sql
stable
as $$
  select * from game.agent_configs
  where enabled = true
    and (spawn->>'map') = p_map_id;
$$;

comment on function game.get_agent_configs_for_map(text) is
  'Returns agent_configs rows for the given map id (spawn.map) with enabled = true. '
  'Used by game server per-map load.';

-- =========================================================================
-- 6. Seed data
-- =========================================================================

-- 6a. agent_configs seeds (from 003, 004, 007, 008 — all graphic = female)

insert into game.agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
values (
  'elder-theron',
  'Elder Theron',
  'female',
  E'You are Elder Theron, the wise village elder of a small settlement.\nYou speak thoughtfully and care deeply about the villagers. You greet\nnewcomers warmly and offer guidance. Keep responses under 150 characters.\n',
  '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'::jsonb,
  '{move,say,look,emote,wait}',
  '{"map":"simplemap","x":300,"y":250}'::jsonb,
  '{"idleInterval":20000,"patrolRadius":3,"greetOnProximity":true}'::jsonb
)
on conflict (id) do nothing;

insert into game.agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
values (
  'test-agent',
  'Test Agent',
  'female',
  E'You are a test NPC in a small village. You can move, look around, emote,\nsay things to the player, and wait. Keep replies very short (under 100 characters).\n',
  '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'::jsonb,
  '{move,say,look,emote,wait}',
  '{"map":"simplemap","x":450,"y":350}'::jsonb,
  '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}'::jsonb
)
on conflict (id) do nothing;

insert into game.agent_configs (id, name, graphic, personality, model, skills, spawn, behavior, inventory)
values (
  'photographer',
  'Photographer',
  'female',
  E'You are a film photographer in a small village. You capture moments on analog film and believe every frame counts. You love the grain, the colors, and the way light hits the emulsion. Keep responses under 150 characters.\n',
  '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'::jsonb,
  '{move,say,look,emote,wait}',
  '{"map":"simplemap","x":500,"y":200}'::jsonb,
  '{"idleInterval":18000,"patrolRadius":3,"greetOnProximity":true}'::jsonb,
  '{image-gen-token}'
)
on conflict (id) do nothing;

insert into game.agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
values (
  'artist',
  'Artist',
  'female',
  E'You are an artist in a small village. You believe art is everywhere if you know how to look. You paint and draw and find the colors of the world breathtaking. Keep responses under 150 characters.\n',
  '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'::jsonb,
  '{move,say,look,emote,wait}',
  '{"map":"simplemap","x":150,"y":400}'::jsonb,
  '{"idleInterval":20000,"patrolRadius":3,"greetOnProximity":true}'::jsonb
)
on conflict (id) do nothing;

-- 6b. api_integrations seeds (from 006)

insert into game.api_integrations (id, name, description, skill_name, required_item_id, requires_env, category)
values (
  'image-generation',
  'Image Generation',
  'Generate images from a text prompt via Gemini. Requires the Mystical Lens (image-gen-token) in inventory.',
  'generate_image',
  'image-gen-token',
  '{GEMINI_API_KEY}',
  'api'
)
on conflict (id) do nothing;
