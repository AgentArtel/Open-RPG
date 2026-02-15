-- Migration 011: Studio Cross-Schema Access
-- Grants Studio (anon/authenticated roles) access to game schema tables
-- so the Studio SPA can manage NPCs and read game data.
--
-- Prerequisites: 009_game_schema.sql must be applied first.

-- ============================================================
-- 1. Expose game schema via PostgREST
-- ============================================================
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, studio, game';
NOTIFY pgrst, 'reload config';

-- ============================================================
-- 2. Grant schema usage
-- ============================================================
GRANT USAGE ON SCHEMA game TO anon, authenticated;

-- ============================================================
-- 3. Config tables: Studio can read AND write
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON game.agent_configs TO authenticated;
GRANT SELECT ON game.agent_configs TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON game.api_integrations TO authenticated;
GRANT SELECT ON game.api_integrations TO anon;

-- ============================================================
-- 4. Runtime tables: Studio can READ only
-- ============================================================
GRANT SELECT ON game.agent_memory TO authenticated, anon;
GRANT SELECT ON game.player_state TO authenticated;

-- ============================================================
-- 5. Functions
-- ============================================================
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA game TO authenticated, anon;

-- ============================================================
-- 6. Future tables auto-grant
-- ============================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA game GRANT SELECT ON TABLES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA game GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;
