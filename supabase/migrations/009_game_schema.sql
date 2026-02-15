-- Migration 009: Game Schema
-- Move game tables into a dedicated `game` schema so that the game server
-- and Studio can use schema-level isolation (game vs public vs studio).
--
-- Tables: agent_configs, api_integrations, agent_memory, player_state
-- RPC: get_agent_configs_for_map

-- ============================================================
-- 1. Create the game schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS game;

-- ============================================================
-- 2. agent_configs — one row per AI NPC
-- ============================================================
CREATE TABLE IF NOT EXISTS game.agent_configs (
  id          text PRIMARY KEY,
  name        text        NOT NULL,
  personality text        NOT NULL,
  graphic     text        NOT NULL DEFAULT 'female',
  skills      text[]      NOT NULL DEFAULT '{}',
  spawn       jsonb       NOT NULL DEFAULT '{}',
  behavior    jsonb       NOT NULL DEFAULT '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}',
  model       jsonb       NOT NULL DEFAULT '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
  inventory   text[]      NOT NULL DEFAULT '{}',
  enabled     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION game.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_configs_updated_at
  BEFORE UPDATE ON game.agent_configs
  FOR EACH ROW EXECUTE FUNCTION game.set_updated_at();

-- ============================================================
-- 3. api_integrations — catalog of API-backed skills
-- ============================================================
CREATE TABLE IF NOT EXISTS game.api_integrations (
  id               text PRIMARY KEY,
  name             text    NOT NULL,
  skill_name       text    NOT NULL UNIQUE,
  category         text    NOT NULL DEFAULT 'api',
  description      text,
  required_item_id text    NOT NULL,
  requires_env     text[]  NOT NULL DEFAULT '{}',
  enabled          boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_api_integrations_updated_at
  BEFORE UPDATE ON game.api_integrations
  FOR EACH ROW EXECUTE FUNCTION game.set_updated_at();

-- ============================================================
-- 4. agent_memory — NPC conversation history
-- ============================================================
CREATE TABLE IF NOT EXISTS game.agent_memory (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   text        NOT NULL,
  role       text        NOT NULL,
  content    text        NOT NULL,
  metadata   jsonb       DEFAULT '{}',
  importance smallint    DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_time
  ON game.agent_memory (agent_id, created_at DESC);

-- ============================================================
-- 5. player_state — last known player position
-- ============================================================
CREATE TABLE IF NOT EXISTS game.player_state (
  player_id  text PRIMARY KEY,
  name       text,
  map_id     text,
  position_x integer,
  position_y integer,
  direction  integer DEFAULT 0,
  state_data jsonb   DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_player_state_updated_at
  BEFORE UPDATE ON game.player_state
  FOR EACH ROW EXECUTE FUNCTION game.set_updated_at();

-- ============================================================
-- 6. RPC: get_agent_configs_for_map
-- ============================================================
CREATE OR REPLACE FUNCTION game.get_agent_configs_for_map(p_map_id text)
RETURNS SETOF game.agent_configs
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM game.agent_configs
  WHERE enabled = true
    AND spawn->>'map' = p_map_id;
$$;

-- ============================================================
-- 7. Seed data
-- ============================================================
INSERT INTO game.api_integrations (id, name, skill_name, category, description, required_item_id, requires_env)
VALUES (
  'image-generation',
  'Image Generation',
  'generate_image',
  'api',
  'Generate images via Gemini Imagen. Requires GEMINI_API_KEY.',
  'image-gen-token',
  ARRAY['GEMINI_API_KEY']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO game.agent_configs (id, name, graphic, personality, model, skills, spawn, behavior, inventory)
VALUES
  ('elder-theron', 'Elder Theron', 'female',
   'You are Elder Theron, the wise village elder. You speak calmly and give sage advice about the village and its history.',
   '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
   ARRAY['move','say','look','emote','wait'],
   '{"map":"simplemap","x":300,"y":250}',
   '{"idleInterval":20000,"patrolRadius":3,"greetOnProximity":true}',
   ARRAY[]::text[]),
  ('test-agent', 'Test Agent', 'female',
   'You are a test NPC in a small village. You are helpful and curious about the world.',
   '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
   ARRAY['move','say','look','emote','wait'],
   '{"map":"simplemap","x":450,"y":350}',
   '{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}',
   ARRAY[]::text[]),
  ('photographer', 'Photographer', 'female',
   'You are the village Photographer. You have a mystical camera that can create images from descriptions. Offer to take photos for players.',
   '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
   ARRAY['move','say','look','emote','wait','generate_image'],
   '{"map":"simplemap","x":200,"y":200}',
   '{"idleInterval":15000,"patrolRadius":2,"greetOnProximity":true}',
   ARRAY['image-gen-token']),
  ('artist', 'Artist', 'female',
   'You are the village Artist. You appreciate beauty and talk about art, colors, and creativity.',
   '{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}',
   ARRAY['move','say','look','emote','wait'],
   '{"map":"simplemap","x":350,"y":150}',
   '{"idleInterval":18000,"patrolRadius":4,"greetOnProximity":true}',
   ARRAY[]::text[])
ON CONFLICT (id) DO NOTHING;
