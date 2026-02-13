/**
 * GameChannelAdapter — converts RPGJS hooks into AgentEvents
 *
 * One instance per AI NPC. Normalizes onAction/onDetectInShape/onDetectOutShape
 * into AgentEvent objects, enqueues them via the LaneQueue, and owns the idle
 * tick setInterval.
 *
 * @see docs/openclaw-patterns.md — Pattern 4: Channel Adapter
 */

import type {
  IGameChannelAdapter,
  GamePlayer,
  GameEvent,
  AgentEvent,
  AgentEventType,
  PlayerSnapshot,
} from './types'
import type { ILaneQueue, IAgentRunner } from '../core/types'

const DEFAULT_IDLE_INTERVAL_MS = 15000
const FIRST_IDLE_DELAY_MS = 3000

/**
 * Build a PlayerSnapshot from a live RpgPlayer.
 * Copies only the data the agent system needs so no live reference is held.
 */
function snapshotPlayer(player: GamePlayer): PlayerSnapshot {
  return {
    id: player.id,
    name: (player as { name?: string }).name ?? 'Player',
    position: {
      x: player.position.x,
      y: player.position.y,
    },
  }
}

/**
 * Build a normalized AgentEvent.
 */
function buildAgentEvent(
  type: AgentEventType,
  player?: GamePlayer
): AgentEvent {
  const event: AgentEvent = {
    type,
    timestamp: Date.now(),
    ...(player ? { player: snapshotPlayer(player) } : {}),
  }
  return event
}

export interface GameChannelAdapterOptions {
  /** The agent's unique identifier (used as the LaneQueue key). */
  agentId: string
  /** The LaneQueue shared across all agents (or per-agent). */
  laneQueue: ILaneQueue
  /** The AgentRunner for this NPC. */
  runner: IAgentRunner
  /** Idle tick interval in ms. Defaults to 15000. */
  idleIntervalMs?: number
  /** Log prefix for console output. */
  logPrefix?: string
}

export class GameChannelAdapter implements IGameChannelAdapter {
  private readonly agentId: string
  private readonly laneQueue: ILaneQueue
  private readonly runner: IAgentRunner
  private readonly idleIntervalMs: number
  private readonly logPrefix: string
  private idleTimer: NodeJS.Timeout | null = null
  private firstIdleTimer: NodeJS.Timeout | null = null
  private disposed = false

  constructor(options: GameChannelAdapterOptions) {
    this.agentId = options.agentId
    this.laneQueue = options.laneQueue
    this.runner = options.runner
    this.idleIntervalMs = options.idleIntervalMs ?? DEFAULT_IDLE_INTERVAL_MS
    this.logPrefix = options.logPrefix ?? `[Adapter:${this.agentId}]`
  }

  /**
   * Start the idle tick timer. Call after registration with the bridge.
   * Fires a first idle tick after a short delay, then repeats at interval.
   */
  start(event: GameEvent): void {
    if (this.disposed) return

    // First idle tick after a short delay so the server can settle
    this.firstIdleTimer = setTimeout(() => {
      this.onIdleTick(event)
    }, FIRST_IDLE_DELAY_MS)

    // Repeating idle tick
    this.idleTimer = setInterval(() => {
      this.onIdleTick(event)
    }, this.idleIntervalMs)
  }

  // -----------------------------------------------------------------------
  // IGameChannelAdapter methods
  // -----------------------------------------------------------------------

  onPlayerAction(player: GamePlayer, _event: GameEvent): void {
    if (this.disposed) return
    const agentEvent = buildAgentEvent('player_action', player)
    this.enqueueRun(agentEvent, 'onAction')
  }

  onPlayerProximity(player: GamePlayer, _event: GameEvent): void {
    if (this.disposed) return
    const agentEvent = buildAgentEvent('player_proximity', player)
    this.enqueueRun(agentEvent, 'proximity')
  }

  onPlayerLeave(player: GamePlayer, _event: GameEvent): void {
    if (this.disposed) return
    const agentEvent = buildAgentEvent('player_leave', player)
    this.enqueueRun(agentEvent, 'leave')
  }

  onIdleTick(_event: GameEvent): void {
    if (this.disposed) return
    const agentEvent = buildAgentEvent('idle_tick')
    this.enqueueRun(agentEvent, 'idle')
  }

  dispose(): void {
    this.disposed = true
    if (this.firstIdleTimer) {
      clearTimeout(this.firstIdleTimer)
      this.firstIdleTimer = null
    }
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /**
   * Enqueue a runner.run(agentEvent) task on the lane queue.
   * All results and errors are logged to the console.
   */
  private enqueueRun(agentEvent: AgentEvent, label: string): void {
    console.log(`${this.logPrefix} enqueueing ${label}`)
    this.laneQueue.enqueue(this.agentId, async () => {
      console.log(`${this.logPrefix} [${label}] task started, calling runner.run()...`)
      try {
        const result = await this.runner.run(agentEvent)
        console.log(
          `${this.logPrefix} [${label}] success=${result.success} duration=${result.durationMs}ms`
        )
        if (result.text) {
          console.log(`${this.logPrefix}   text: ${result.text}`)
        }
        if (result.skillResults?.length) {
          result.skillResults.forEach((sr) => {
            console.log(
              `${this.logPrefix}   skill: ${sr.skillName} -> ${sr.result.message}`
            )
          })
        }
        if (result.error) {
          console.error(`${this.logPrefix}   error: ${result.error}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${this.logPrefix} [${label}] run failed:`, msg)
      }
    })
  }
}
