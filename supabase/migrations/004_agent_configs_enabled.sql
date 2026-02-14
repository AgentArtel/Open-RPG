-- Add enabled flag so NPCs can be toggled on/off without deleting rows.
-- Game only loads and spawns rows where enabled = true.

alter table agent_configs
  add column if not exists enabled boolean not null default true;

comment on column agent_configs.enabled is
  'When true, this NPC is loaded and spawned on its map. Set to false to disable without deleting.';

-- RPC so the game can fetch configs for one map without relying on client jsonb filter syntax.
create or replace function get_agent_configs_for_map(p_map_id text)
returns setof agent_configs
language sql
stable
as $$
  select * from agent_configs
  where enabled = true
    and (spawn->>'map') = p_map_id;
$$;

comment on function get_agent_configs_for_map(text) is
  'Returns agent_configs rows for the given map id (spawn.map) with enabled = true. Used by game server per-map load.';

-- Seed: remaining AI NPCs from src/config/agents/ (elder-theron already in 003)
insert into agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
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

-- Seed: Photographer (AI version; spawn matches main/player.ts Photographer position)
insert into agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
values (
  'photographer',
  'Photographer',
  'female',
  E'You are a film photographer in a small village. You capture moments on analog film and believe every frame counts. You love the grain, the colors, and the way light hits the emulsion. Keep responses under 150 characters.\n',
  '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}'::jsonb,
  '{move,say,look,emote,wait}',
  '{"map":"simplemap","x":500,"y":200}'::jsonb,
  '{"idleInterval":18000,"patrolRadius":3,"greetOnProximity":true}'::jsonb
)
on conflict (id) do nothing;

-- Seed: Artist (AI version; spawn matches main/player.ts Artist position)
insert into agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
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
