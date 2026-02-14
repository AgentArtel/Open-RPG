/**
 * Persistence — barrel exports and factory
 *
 * Provides createPlayerStateManager() which returns a PlayerStateManager
 * backed by Supabase when configured, or a no-op manager when not.
 *
 * Usage:
 *   import { createPlayerStateManager } from '../src/persistence'
 *   const manager = createPlayerStateManager()
 *   const state = await manager.loadPlayer('player-123')
 */

import { getSupabaseClient } from '../config/supabase'
import { PlayerStateManager } from './PlayerStateManager'

// Re-export types and class for direct use
export { PlayerStateManager } from './PlayerStateManager'
export type { PlayerState } from './PlayerStateManager'

/**
 * Factory: create a PlayerStateManager with the current Supabase client.
 *
 * - If Supabase is configured → manager persists to player_state table
 * - If Supabase is NOT configured → manager no-ops (load returns null, save skips)
 *
 * Call this once at module load time. The returned manager is safe to use
 * regardless of whether Supabase is available.
 */
export function createPlayerStateManager(): PlayerStateManager {
  const supabase = getSupabaseClient()
  return new PlayerStateManager(supabase)
}
