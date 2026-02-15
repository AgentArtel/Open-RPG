/**
 * Bridge — routes RPGJS hooks to the correct agent's GameChannelAdapter
 *
 * Maintains a registry mapping RpgEvent instances (by event.id) to their
 * agent ID and adapter. When an NPC's RPGJS hook fires, the game code calls
 * bridge.handlePlayerAction(player, event) etc., and the bridge looks up the
 * correct adapter and delegates.
 *
 * The idle tick timer lives inside each GameChannelAdapter, so the bridge
 * only routes player-initiated hooks: action, proximity, leave.
 *
 * @see docs/openclaw-patterns.md — Pattern 4: Channel Adapter
 */

import type {
  IBridge,
  IGameChannelAdapter,
  GameEvent,
  GamePlayer,
  AgentEvent,
} from './types'

const LOG_PREFIX = '[Bridge]'

/** Internal record stored per registered agent. */
interface AgentRegistration {
  agentId: string
  adapter: IGameChannelAdapter
}

export class Bridge implements IBridge {
  /** Map from event.id → { agentId, adapter }. */
  private readonly registry = new Map<string, AgentRegistration>()

  /** Reverse map: agentId → current GameEvent (latest registration wins). */
  private readonly agentIdToEvent = new Map<string, GameEvent>()

  // -----------------------------------------------------------------------
  // IBridge — registration
  // -----------------------------------------------------------------------

  /**
   * Bind an RPGJS event to an agent via an adapter.
   * Starts the adapter's idle timer automatically.
   *
   * @param event   - The live RpgEvent on the map.
   * @param agentId - Unique agent identifier.
   * @param adapter - The GameChannelAdapter for this agent.
   */
  registerAgent(event: GameEvent, agentId: string, adapter?: IGameChannelAdapter): void {
    const eventId = event.id
    if (this.registry.has(eventId)) {
      console.warn(`${LOG_PREFIX} Agent already registered for event ${eventId}, overwriting.`)
      // Dispose the old adapter first
      const old = this.registry.get(eventId)
      old?.adapter.dispose()
    }

    if (!adapter) {
      console.warn(`${LOG_PREFIX} registerAgent called without adapter for ${agentId}. Registering ID only.`)
      this.registry.set(eventId, { agentId, adapter: createNoOpAdapter() })
      this.agentIdToEvent.set(agentId, event)
      return
    }

    this.registry.set(eventId, { agentId, adapter })
    this.agentIdToEvent.set(agentId, event)
    console.log(`${LOG_PREFIX} Registered agent "${agentId}" for event ${eventId}`)

    // Start the adapter's idle tick timer
    if ('start' in adapter && typeof (adapter as { start?: Function }).start === 'function') {
      ;(adapter as { start: (event: GameEvent) => void }).start(event)
    }
  }

  /**
   * Remove the binding for an event. Disposes the adapter's timers.
   */
  unregisterAgent(event: GameEvent): void {
    const eventId = event.id
    const reg = this.registry.get(eventId)
    if (!reg) return

    if (this.agentIdToEvent.get(reg.agentId) === event) {
      this.agentIdToEvent.delete(reg.agentId)
    }
    console.log(`${LOG_PREFIX} Unregistering agent "${reg.agentId}" for event ${eventId}`)
    reg.adapter.dispose()
    this.registry.delete(eventId)
  }

  /**
   * Look up which agent ID is bound to a given event.
   */
  getAgentId(event: GameEvent): string | undefined {
    return this.registry.get(event.id)?.agentId
  }

  /**
   * Look up the current GameEvent for an agent (e.g. to show UI on the NPC).
   * Returns the most recently registered event for that agentId.
   */
  getEventByAgentId(agentId: string): GameEvent | undefined {
    return this.agentIdToEvent.get(agentId)
  }

  // -----------------------------------------------------------------------
  // IBridge — event routing
  // -----------------------------------------------------------------------

  /**
   * Route a generic game event to the appropriate adapter.
   * Prefer using the typed handle methods below for clarity.
   */
  handleGameEvent(event: GameEvent, data: AgentEvent): void {
    const reg = this.registry.get(event.id)
    if (!reg) {
      console.warn(`${LOG_PREFIX} handleGameEvent: no agent registered for event ${event.id}`)
      return
    }

    // Dispatch based on event type
    switch (data.type) {
      case 'player_action':
        // For player events, we need the raw player — this path is mainly
        // for programmatic dispatching. Prefer handlePlayerAction() instead.
        console.warn(`${LOG_PREFIX} handleGameEvent with player_action — use handlePlayerAction for typed routing`)
        break
      case 'idle_tick':
        reg.adapter.onIdleTick(event)
        break
      default:
        console.warn(`${LOG_PREFIX} handleGameEvent: unhandled type "${data.type}"`)
    }
  }

  // -----------------------------------------------------------------------
  // Typed routing helpers (preferred over handleGameEvent)
  // -----------------------------------------------------------------------

  /**
   * Route a player action to the correct adapter.
   * Call this from the NPC's onAction() hook.
   */
  handlePlayerAction(player: GamePlayer, event: GameEvent): void {
    const reg = this.registry.get(event.id)
    if (!reg) {
      console.warn(`${LOG_PREFIX} handlePlayerAction: no agent for event ${event.id}`)
      return
    }
    reg.adapter.onPlayerAction(player, event)
  }

  /**
   * Route a proximity enter event to the correct adapter.
   * Call this from the NPC's onDetectInShape() hook.
   */
  handlePlayerProximity(player: GamePlayer, event: GameEvent): void {
    const reg = this.registry.get(event.id)
    if (!reg) return
    reg.adapter.onPlayerProximity(player, event)
  }

  /**
   * Route a player leave event to the correct adapter.
   * Call this from the NPC's onDetectOutShape() hook.
   */
  handlePlayerLeave(player: GamePlayer, event: GameEvent): void {
    const reg = this.registry.get(event.id)
    if (!reg) return
    reg.adapter.onPlayerLeave(player, event)
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Dispose all registered adapters and clear the registry.
   */
  dispose(): void {
    console.log(`${LOG_PREFIX} Disposing all agents (${this.registry.size} registered)`)
    for (const [, reg] of this.registry) {
      try {
        reg.adapter.dispose()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${LOG_PREFIX} Error disposing adapter for "${reg.agentId}":`, msg)
      }
    }
    this.registry.clear()
    this.agentIdToEvent.clear()
  }
}

// ---------------------------------------------------------------------------
// No-op adapter (used when registerAgent is called without an adapter)
// ---------------------------------------------------------------------------

function createNoOpAdapter(): IGameChannelAdapter {
  return {
    onPlayerAction() {},
    onPlayerProximity() {},
    onPlayerLeave() {},
    onIdleTick() {},
    dispose() {},
  }
}
