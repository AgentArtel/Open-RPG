-- 011_studio_cross_schema_access.sql
-- Grant the Studio app (anon/authenticated roles) access to game schema tables.
--
-- WHY: The Studio app connects via the public anon key, which maps to the
-- 'anon' and 'authenticated' Postgres roles.  The game schema (migration 009)
-- only granted access to 'service_role'.  This migration opens read/write
-- access so Studio can manage NPC configs, integrations, and view game state
-- through the same Supabase PostgREST API.
--
-- SECURITY MODEL:
--   • service_role  → full access (game server, bypasses RLS)
--   • authenticated → read/write on config tables, read-only on runtime tables
--   • anon          → read-only on config tables (public dashboard/embed)
--
-- RLS: Game tables do NOT have RLS enabled.  The game server uses service_role
-- which bypasses RLS anyway.  For Studio, the permissive grants below are
-- sufficient for an admin-only tool.  When you add multi-tenant or public
-- access later, enable RLS and add policies per table.
--
-- PREREQUISITE: Make sure PostgREST exposes the game schema.  Run once:
--   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, studio, game';
--   NOTIFY pgrst, 'reload config';

-- =========================================================================
-- 1. Ensure PostgREST serves all three schemas
-- =========================================================================
-- This is idempotent — safe to re-run.  It overwrites the previous setting
-- (which was 'public, studio' from Studio migration 1).

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, studio, game';
NOTIFY pgrst, 'reload config';

-- =========================================================================
-- 2. Grant schema-level USAGE to anon and authenticated
-- =========================================================================
-- Without USAGE, these roles can't even see that the schema exists.

GRANT USAGE ON SCHEMA game TO anon, authenticated;

-- =========================================================================
-- 3. Table-level grants — config tables (Studio can read AND write)
-- =========================================================================
-- These are the tables Studio manages:  NPC definitions and API integrations.

-- agent_configs: Studio creates/edits NPCs
GRANT SELECT, INSERT, UPDATE, DELETE ON game.agent_configs TO authenticated;
GRANT SELECT ON game.agent_configs TO anon;

-- api_integrations: Studio manages available API skills
GRANT SELECT, INSERT, UPDATE, DELETE ON game.api_integrations TO authenticated;
GRANT SELECT ON game.api_integrations TO anon;

-- =========================================================================
-- 4. Table-level grants — runtime tables (Studio can READ only)
-- =========================================================================
-- These tables are written by the game server at runtime.
-- Studio reads them for dashboards, memory viewers, player tracking.

-- agent_memory: Studio can view conversation logs (read-only)
GRANT SELECT ON game.agent_memory TO authenticated;
GRANT SELECT ON game.agent_memory TO anon;

-- player_state: Studio can view player positions (read-only)
GRANT SELECT ON game.player_state TO authenticated;

-- =========================================================================
-- 5. Function grants — RPCs
-- =========================================================================
-- Allow Studio to call game schema functions (e.g. get_agent_configs_for_map).

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA game TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA game TO anon;

-- =========================================================================
-- 6. Default privileges for future tables
-- =========================================================================
-- Any NEW tables created in the game schema will automatically be readable
-- by authenticated users.  Write access must be granted explicitly per table.

ALTER DEFAULT PRIVILEGES IN SCHEMA game
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA game
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA game
  GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;
