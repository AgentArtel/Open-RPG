/**
 * Supabase Client Singleton
 *
 * Provides a lazily-initialized Supabase client for server-side use.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Returns null if either is missing, allowing callers to fall back gracefully.
 *
 * Usage:
 *   const client = getSupabaseClient()
 *   if (client) { // Supabase available }
 *
 * IMPORTANT: Uses the service_role key (bypasses RLS). This client must
 * only be used on the server — never expose it to the RPGJS client.
 */

import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const LOG_PREFIX = '[Supabase]'

// SupabaseClient generic: <Database, SchemaName, Schema, ...>
// We use the "game" schema (migration 009), so the third type param is "game".
// Consumers that accept SupabaseClient<any, string, any> will work fine.
type GameClient = SupabaseClient<any, 'game'>

// Module-level cache — created once, reused for the process lifetime
let client: GameClient | null = null
let initAttempted = false

/**
 * Get the Supabase client singleton.
 *
 * @returns The SupabaseClient if env vars are configured, or null if missing.
 */
export function getSupabaseClient(): GameClient | null {
  // Only attempt init once — avoid repeated warnings on every call
  if (initAttempted) return client

  initAttempted = true

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn(
      `${LOG_PREFIX} SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. ` +
        'Agent memory will use in-memory fallback (data lost on restart). ' +
        'See docs/supabase-setup-guide.md to configure persistence.'
    )
    return null
  }

  try {
    client = createClient(url, key, {
      auth: {
        // Service role key doesn't need auth state management
        autoRefreshToken: false,
        persistSession: false,
      },
      // All game tables live in the "game" schema (migration 009).
      // Every .from() and .rpc() call uses this schema automatically.
      db: { schema: 'game' },
    })
    console.log(`${LOG_PREFIX} Client initialized for ${url}`)
    return client
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${LOG_PREFIX} Failed to create client: ${msg}`)
    return null
  }
}
