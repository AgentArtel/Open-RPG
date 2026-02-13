/**
 * Bridge module barrel — public API for the RPGJS ↔ Agent bridge layer.
 *
 * Exports:
 * - Bridge class and shared singleton
 * - GameChannelAdapter class
 * - All bridge types
 */

// Classes
export { Bridge } from './Bridge'
export { GameChannelAdapter } from './GameChannelAdapter'
export type { GameChannelAdapterOptions } from './GameChannelAdapter'

// Types (re-export everything from types.ts)
export type {
  IGameChannelAdapter,
  IBridge,
  GameEvent,
  GamePlayer,
  AgentEvent,
  AgentEventType,
  PlayerSnapshot,
  Position,
  MapInfo,
} from './types'

// ---------------------------------------------------------------------------
// Shared Bridge Singleton (MVP)
// ---------------------------------------------------------------------------
// One bridge instance shared by all AI NPCs. For testing / DI, modules can
// create their own Bridge and pass it explicitly.

import { Bridge } from './Bridge'

/** The default bridge instance used by all AI NPCs in the game server. */
export const bridge = new Bridge()
