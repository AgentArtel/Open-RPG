/**
 * Agent Memory — barrel exports and factory
 *
 * Provides createAgentMemory() which returns a SupabaseAgentMemory
 * when Supabase env vars are configured, or falls back to
 * InMemoryAgentMemory when they're not.
 *
 * Usage:
 *   import { createAgentMemory } from '../../src/agents/memory'
 *   const memory = createAgentMemory('elder-theron')
 *   await memory.load('elder-theron')
 */

import { getSupabaseClient } from '../../config/supabase'
import { InMemoryAgentMemory } from './InMemoryAgentMemory'
import { SupabaseAgentMemory } from './SupabaseAgentMemory'

import type { IAgentMemory } from './types'

// Re-export types and implementations for convenience
export { InMemoryAgentMemory } from './InMemoryAgentMemory'
export { SupabaseAgentMemory } from './SupabaseAgentMemory'
export type {
  IAgentMemory,
  MemoryEntry,
  MemoryRole,
  MemoryConfig,
} from './types'

/**
 * Factory: create the best available IAgentMemory for a given agent.
 *
 * - If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set → SupabaseAgentMemory
 * - Otherwise → InMemoryAgentMemory (data lost on restart)
 *
 * The caller should call `await memory.load(agentId)` after creation
 * to hydrate prior conversation history from the database.
 *
 * @param agentId - Unique ID of the agent (e.g. 'elder-theron')
 * @returns An IAgentMemory instance ready for use.
 */
export function createAgentMemory(agentId: string): IAgentMemory {
  const supabase = getSupabaseClient()

  if (supabase) {
    console.log(`[AgentMemory] Using SupabaseAgentMemory for "${agentId}"`)
    return new SupabaseAgentMemory(agentId, supabase)
  }

  console.log(
    `[AgentMemory] Using InMemoryAgentMemory for "${agentId}" (Supabase not configured)`
  )
  return new InMemoryAgentMemory()
}
