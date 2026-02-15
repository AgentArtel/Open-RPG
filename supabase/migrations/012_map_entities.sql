-- 012_map_entities.sql
-- TMX-to-DB sync layer: tables for synced map entities and map-level metadata.
-- Used by the sync script (and optionally Studio) to store Tiled-derived data.
-- Grants follow the 011 pattern: anon=SELECT, authenticated=full CRUD, service_role=ALL.
--
-- ORPHAN BEHAVIOR: Deleting a row from map_entities (e.g. entity removed from TMX
-- and re-synced) does NOT cascade to game.agent_configs. The agent_configs row
-- becomes orphaned. This is acceptable; Studio can manage or delete orphaned configs.

-- =========================================================================
-- 1. map_entities — all entity types synced from TMX (NPCs, objects, triggers, areas, spawn-points)
-- =========================================================================

CREATE TABLE IF NOT EXISTS game.map_entities (
  id              text        NOT NULL,
  map_id          text        NOT NULL,
  entity_type     text        NOT NULL,
  display_name    text,
  position_x      real        NOT NULL,
  position_y      real        NOT NULL,
  tiled_class     text,
  role            text,
  sprite          text        DEFAULT 'female',
  ai_enabled      boolean     DEFAULT false,
  tools           text[]      DEFAULT '{}',
  area_id         text,
  metadata        jsonb       DEFAULT '{}',
  agent_config_id text        REFERENCES game.agent_configs(id) ON DELETE SET NULL,
  synced_at       timestamptz DEFAULT now(),
  PRIMARY KEY (id, map_id)
);

COMMENT ON TABLE game.map_entities IS
  'Entities synced from Tiled TMX (NPCs, objects, triggers, areas, spawn-points). Links to agent_configs for ai-npc type. Deleting a row does not cascade to agent_configs (orphan acceptable).';

-- =========================================================================
-- 2. map_metadata — per-map properties from TMX
-- =========================================================================

CREATE TABLE IF NOT EXISTS game.map_metadata (
  map_id       text        PRIMARY KEY,
  description text,
  theme       text,
  ambient     text,
  synced_at   timestamptz  DEFAULT now()
);

COMMENT ON TABLE game.map_metadata IS
  'Per-map metadata synced from Tiled (description, theme, ambient).';

-- =========================================================================
-- 3. Grants (011-aligned: anon=SELECT, authenticated=CRUD, service_role=ALL)
-- =========================================================================

GRANT SELECT ON game.map_entities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON game.map_entities TO authenticated;
GRANT ALL ON game.map_entities TO service_role;

GRANT SELECT ON game.map_metadata TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON game.map_metadata TO authenticated;
GRANT ALL ON game.map_metadata TO service_role;
