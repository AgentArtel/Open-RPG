-- TASK-013: Player State Persistence
-- Creates the player_state table for saving/restoring player position across sessions.
-- Run this in the Supabase SQL Editor (or via supabase db push).

-- Player state table: one row per player, upserted on disconnect
create table if not exists player_state (
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

-- Auto-update updated_at on every UPDATE (idempotent with CREATE OR REPLACE)
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop and recreate to avoid "trigger already exists" on re-run
drop trigger if exists player_state_updated on player_state;
create trigger player_state_updated
  before update on player_state
  for each row execute function update_timestamp();

-- Documentation
comment on table player_state is
  'Stores per-player position and state so players resume where they left off. '
  'Upserted on disconnect, loaded on connect. Do NOT store secrets in state_data.';
