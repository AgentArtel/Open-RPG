/**
 * Spawn Context — passes agent config and instance from AgentManager to AgentNpcEvent
 *
 * Because map.createDynamicEvent({ event: EventClass }) only receives a class (no constructor
 * args), we set a "current spawn" slot before each createDynamicEvent. AgentNpcEvent reads
 * it in onInit(), wires the adapter to the bridge, then clears the slot.
 *
 * Lives in a separate module to avoid circular imports (AgentManager ↔ AgentNpcEvent).
 */

import type { AgentConfig, AgentInstance } from './types'

export interface SpawnContext {
  config: AgentConfig
  instance: AgentInstance & {
    adapter: import('../bridge/types').IGameChannelAdapter
    contextProvider: { getContext: import('./types').RunContextProvider }
  }
}

let current: SpawnContext | null = null

export function setSpawnContext(ctx: SpawnContext): void {
  current = ctx
}

export function getAndClearSpawnContext(): SpawnContext | null {
  const ctx = current
  current = null
  return ctx
}
