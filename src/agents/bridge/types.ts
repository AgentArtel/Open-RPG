/**
 * Bridge Layer Types
 *
 * Defines the interface between the RPGJS game world and the agent system.
 * This is the ONLY module that directly references RPGJS types — all other
 * agent modules work with normalized types instead.
 *
 * Pattern: OpenClaw Channel Adapter (docs/openclaw-patterns.md, Pattern 4)
 * Reference: docs/openclaw-reference/src/channels/plugins/types.ts
 */

import type { RpgEvent, RpgPlayer } from '@rpgjs/server';

// ---------------------------------------------------------------------------
// Type Aliases — thin wrappers so the rest of the agent system doesn't
// import @rpgjs/server directly.
// ---------------------------------------------------------------------------

/** Raw RPGJS event (NPC) reference used inside the bridge layer. */
export type GameEvent = RpgEvent;

/** Raw RPGJS player reference used inside the bridge layer. */
export type GamePlayer = RpgPlayer;

// ---------------------------------------------------------------------------
// Position & Map helpers
// ---------------------------------------------------------------------------

/** A simple 2-D position in tile or pixel coordinates. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/** Minimal map metadata passed through the bridge. */
export interface MapInfo {
  /** Unique map identifier (e.g. "simplemap"). */
  readonly id: string;
  /** Human-readable map name, if available. */
  readonly name?: string;
}

// ---------------------------------------------------------------------------
// Normalized Agent Events
// ---------------------------------------------------------------------------

/**
 * The set of event types the bridge can emit into the agent system.
 *
 * - `player_action`    — a player pressed the action key on this NPC
 * - `player_proximity` — a player entered the NPC's detection shape
 * - `player_leave`     — a player left the NPC's detection shape
 * - `idle_tick`        — periodic idle heartbeat (~15 s)
 */
export type AgentEventType =
  | 'player_action'
  | 'player_proximity'
  | 'player_leave'
  | 'idle_tick';

/**
 * A normalized event emitted by the bridge into the agent system.
 * All RPGJS-specific details are stripped; the agent runner works
 * exclusively with this shape.
 */
export interface AgentEvent {
  /** What happened. */
  readonly type: AgentEventType;
  /** Unix-ms timestamp of when the event was captured. */
  readonly timestamp: number;
  /** The player involved (absent for idle_tick). */
  readonly player?: PlayerSnapshot;
  /** Optional extra payload (future-proofing). */
  readonly data?: Record<string, unknown>;
}

/**
 * A lightweight, serializable snapshot of a player at the moment an
 * event is captured. We copy the data we need so the agent system
 * never holds a live RpgPlayer reference.
 */
export interface PlayerSnapshot {
  /** RPGJS player id. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Tile-based position on the map. */
  readonly position: Position;
}

// ---------------------------------------------------------------------------
// IGameChannelAdapter — inbound: RPGJS → Agent System
// ---------------------------------------------------------------------------

/**
 * Converts raw RPGJS lifecycle hooks into normalized {@link AgentEvent}s
 * and pushes them into the agent's lane queue.
 *
 * One adapter instance per AI-controlled NPC.
 *
 * Inbound flow:
 *   RPGJS hook → adapter method → AgentEvent → lane queue → AgentRunner
 *
 * Outbound flow (agent → game) is handled by the skill system, which
 * calls RPGJS APIs directly through the GameContext.
 *
 * @see docs/openclaw-patterns.md — Pattern 4: Channel Adapter
 */
export interface IGameChannelAdapter {
  /**
   * Called when a player presses the action key while facing this NPC.
   * Maps to the RPGJS `onAction(player)` hook.
   *
   * @param player - The RPGJS player who triggered the action.
   * @param event  - The RPGJS event (NPC) being interacted with.
   */
  onPlayerAction(player: GamePlayer, event: GameEvent): void;

  /**
   * Called when a player enters the NPC's detection shape.
   * Maps to the RPGJS `onDetectInShape(player, shape)` hook.
   *
   * @param player - The RPGJS player who entered the shape.
   * @param event  - The RPGJS event (NPC) that owns the shape.
   */
  onPlayerProximity(player: GamePlayer, event: GameEvent): void;

  /**
   * Called when a player leaves the NPC's detection shape.
   * Maps to the RPGJS `onDetectOutShape(player, shape)` hook.
   *
   * @param player - The RPGJS player who left the shape.
   * @param event  - The RPGJS event (NPC) that owns the shape.
   */
  onPlayerLeave(player: GamePlayer, event: GameEvent): void;

  /**
   * Called on a periodic timer (~15 s) to give the NPC a chance to
   * act autonomously.  Driven by `setInterval`, NOT by RPGJS `onStep`.
   *
   * @param event - The RPGJS event (NPC) receiving the idle tick.
   */
  onIdleTick(event: GameEvent): void;

  /**
   * Tear down listeners and clear the idle timer.
   * Called when the NPC is removed from the map or the server shuts down.
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// IBridge — registry that binds RpgEvent instances to agent IDs
// ---------------------------------------------------------------------------

/**
 * Manages the mapping between RPGJS `RpgEvent` instances and agent IDs.
 *
 * When an AI NPC spawns on a map, the bridge registers the event so that
 * incoming RPGJS hooks can be routed to the correct agent.
 */
export interface IBridge {
  /**
   * Bind an RPGJS event to an agent.
   *
   * @param event   - The live RpgEvent instance on the map.
   * @param agentId - The agent identifier (matches AgentConfig.id).
   */
  registerAgent(event: GameEvent, agentId: string): void;

  /**
   * Remove the binding for an event (e.g. NPC removed from map).
   *
   * @param event - The RpgEvent to unbind.
   */
  unregisterAgent(event: GameEvent): void;

  /**
   * Look up which agent ID is bound to a given event.
   *
   * @param event - The RpgEvent to look up.
   * @returns The agent ID, or `undefined` if the event is not registered.
   */
  getAgentId(event: GameEvent): string | undefined;

  /**
   * Look up the current GameEvent for an agent.
   *
   * @param agentId - The agent identifier.
   * @returns The most recently registered RpgEvent for that agent, or `undefined`.
   */
  getEventByAgentId(agentId: string): GameEvent | undefined;

  /**
   * Route a raw game event to the appropriate agent.
   *
   * @param event - The RpgEvent that triggered the hook.
   * @param data  - The normalized AgentEvent payload.
   */
  handleGameEvent(event: GameEvent, data: AgentEvent): void;

  /**
   * Tear down all adapters and clear all registrations.
   */
  dispose(): void;
}

