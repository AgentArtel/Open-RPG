/**
 * PlayerStateManager — server-side player state persistence via Supabase
 *
 * Saves player position, map, name, and direction to the `player_state` table
 * on disconnect, and restores it on connect. If Supabase is not configured
 * (client is null), every method gracefully no-ops so the game runs without
 * persistence.
 *
 * All public methods catch errors internally and log them — they never throw.
 * This ensures a failed save/load never crashes the game server.
 *
 * @see supabase/migrations/002_player_state.sql — table schema
 * @see src/config/supabase.ts — Supabase client singleton
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[PlayerState]'
const TABLE_NAME = 'player_state'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of a player's persisted state.
 * Uses camelCase in TypeScript; mapped to snake_case columns in Postgres.
 */
export interface PlayerState {
  playerId: string
  name: string
  mapId: string
  positionX: number
  positionY: number
  direction: number
  stateData: Record<string, unknown>
}

/**
 * Shape of a row in the player_state table (snake_case, matches migration 002).
 */
interface PlayerStateRow {
  player_id: string
  name: string
  map_id: string
  position_x: number
  position_y: number
  direction: number
  state_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// PlayerStateManager
// ---------------------------------------------------------------------------

export class PlayerStateManager {
  private readonly supabase: SupabaseClient | null

  /**
   * @param supabase — The Supabase client, or null if persistence is unavailable.
   *   When null, all methods no-op gracefully.
   */
  constructor(supabase: SupabaseClient | null) {
    this.supabase = supabase

    if (supabase) {
      console.log(`${LOG_PREFIX} Initialized with Supabase persistence`)
    } else {
      console.log(
        `${LOG_PREFIX} Supabase not configured — player state will not persist`
      )
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Upsert player state into the player_state table.
   * Logs errors but never throws.
   */
  async savePlayer(state: PlayerState): Promise<void> {
    if (!this.supabase) return

    try {
      const { error } = await this.supabase.from(TABLE_NAME).upsert(
        {
          player_id: state.playerId,
          name: state.name,
          map_id: state.mapId,
          position_x: state.positionX,
          position_y: state.positionY,
          direction: state.direction,
          state_data: state.stateData,
        },
        { onConflict: 'player_id' }
      )

      if (error) {
        console.error(`${LOG_PREFIX} Save failed for "${state.playerId}":`, error.message)
        return
      }

      console.log(
        `${LOG_PREFIX} Saved state for "${state.playerId}" ` +
          `(map=${state.mapId}, x=${state.positionX}, y=${state.positionY})`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Save error for "${state.playerId}":`, msg)
    }
  }

  /**
   * Load saved state for a player.
   * Returns null if no saved state exists, Supabase is unavailable, or on error.
   */
  async loadPlayer(playerId: string): Promise<PlayerState | null> {
    if (!this.supabase) return null

    try {
      const { data, error } = await this.supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (error) {
        // "PGRST116" = no rows found — not a real error, just no saved state
        if (error.code === 'PGRST116') {
          console.log(`${LOG_PREFIX} No saved state for "${playerId}" — fresh start`)
          return null
        }
        console.error(`${LOG_PREFIX} Load failed for "${playerId}":`, error.message)
        return null
      }

      if (!data) return null

      const row = data as PlayerStateRow
      const state: PlayerState = {
        playerId: row.player_id,
        name: row.name,
        mapId: row.map_id,
        positionX: row.position_x,
        positionY: row.position_y,
        direction: row.direction,
        stateData: row.state_data ?? {},
      }

      console.log(
        `${LOG_PREFIX} Loaded state for "${playerId}" ` +
          `(map=${state.mapId}, x=${state.positionX}, y=${state.positionY})`
      )

      return state
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Load error for "${playerId}":`, msg)
      return null
    }
  }

  /**
   * Delete saved state for a player (e.g. account cleanup).
   * Logs errors but never throws.
   */
  async deletePlayer(playerId: string): Promise<void> {
    if (!this.supabase) return

    try {
      const { error } = await this.supabase
        .from(TABLE_NAME)
        .delete()
        .eq('player_id', playerId)

      if (error) {
        console.error(`${LOG_PREFIX} Delete failed for "${playerId}":`, error.message)
        return
      }

      console.log(`${LOG_PREFIX} Deleted state for "${playerId}"`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Delete error for "${playerId}":`, msg)
    }
  }
}
