/**
 * Game Schema Helper
 *
 * All queries to game tables (agent_configs, api_integrations, agent_memory,
 * player_state) MUST go through this helper or use supabase.schema('game')
 * directly. Never use the default schema for game tables.
 *
 * See: docs/game-integration/NPC-BUILDER-PLAN.md
 */
import { supabase } from '@/integrations/supabase/client';

/** Returns a PostgREST client scoped to the `game` schema. */
export const gameDb = () => supabase.schema('game');
