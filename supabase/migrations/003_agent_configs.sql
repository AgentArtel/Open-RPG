-- TASK-018b: Supabase Agent Config (Database-First)
-- Creates the agent_configs table so AI NPC config can be managed from Supabase.
-- Game loads from this table when Supabase env vars are set; falls back to YAML otherwise.
-- Run this in the Supabase SQL Editor (or via supabase db push).
-- Requires: 002_player_state.sql (provides update_timestamp() function).

-- Agent config table: one row per AI NPC, aligned to AgentConfig in src/agents/core/types.ts
create table if not exists agent_configs (
  id          text        primary key,                          -- AgentConfig.id (lane queue key)
  name        text        not null,                             -- display name above sprite
  graphic     text        not null,                             -- RPGJS spritesheet graphic ID
  personality text        not null,                             -- system prompt personality block
  model       jsonb       not null default '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
  skills      text[]      not null default '{move,say,look,emote,wait}',
  spawn       jsonb       not null,                             -- { "map": "...", "x": ..., "y": ... }
  behavior    jsonb       not null default '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Reuse update_timestamp() from 002_player_state.sql (already exists)
drop trigger if exists agent_configs_updated on agent_configs;
create trigger agent_configs_updated
  before update on agent_configs
  for each row execute function update_timestamp();

-- Documentation
comment on table agent_configs is
  'Declarative AI NPC configuration. Each row drives one agent: personality, model selection, '
  'skills, spawn location, and behavior tuning. Game loads from this table when Supabase is '
  'configured; falls back to YAML files in src/config/agents/ otherwise. '
  'See docs/supabase-schema.md for the full contract.';

-- Seed: one proof NPC (Elder Theron) matching src/config/agents/elder-theron.yaml
-- This row proves the DB-first load path works end-to-end.
insert into agent_configs (id, name, graphic, personality, model, skills, spawn, behavior)
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
on conflict (id) do nothing;  -- idempotent: skip if already exists
