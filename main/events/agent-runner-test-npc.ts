/**
 * Agent Runner Test NPC — Live integration test for the Core Agent System
 *
 * Now uses the Bridge + GameChannelAdapter pattern (Phase 4).
 * The NPC builds its own runner/lane/memory/perception/skills (Option A),
 * wraps them in a GameChannelAdapter, and registers with the shared bridge.
 *
 * The adapter handles:
 * - Idle tick timer (setInterval / setTimeout)
 * - Enqueueing runner.run() on the LaneQueue
 * - Logging results and errors
 *
 * The NPC simply forwards RPGJS hooks to the bridge.
 *
 * Triggers:
 * - Idle tick: every 15s the NPC gets "a moment to yourself" and may use skills
 * - onAction: when you talk to the NPC, it gets a player_action event
 *
 * Requires: MOONSHOT_API_KEY or KIMI_API_KEY in .env
 */

import {
  RpgEvent,
  EventData,
  RpgPlayer,
  RpgWorld,
  type RpgMap,
} from '@rpgjs/server'
import {
  AgentRunner,
  LaneQueue,
  LLMClient,
  InMemoryAgentMemory,
} from '../../src/agents/core'
import { PerceptionEngine } from '../../src/agents/perception/PerceptionEngine'
import {
  SkillRegistry,
  moveSkill,
  saySkill,
  createLookSkill,
  emoteSkill,
  waitSkill,
} from '../../src/agents/skills'
import { bridge, GameChannelAdapter } from '../../src/agents/bridge'
import type { AgentConfig, AgentEvent, RunContext } from '../../src/agents/core/types'
import type { PerceptionContext } from '../../src/agents/perception/types'
import type { GameContext, NearbyPlayerInfo } from '../../src/agents/skills/types'
import type { Position } from '../../src/agents/bridge/types'

const TILE_SIZE = 32
const LOG_PREFIX = '[AgentRunnerTestNPC]'
const AGENT_ID = 'agent-runner-test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tileDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.round(Math.sqrt(dx * dx + dy * dy) / TILE_SIZE)
}

function createAgentConfig(): AgentConfig {
  return {
    id: AGENT_ID,
    name: 'Agent Runner Test',
    graphic: 'female',
    personality:
      'You are a test NPC in a small village. You can move, look around, emote, say things to the player, and wait. Keep replies very short (under 100 characters).',
    // Default both to kimi-k2-0711-preview so conversation works;
    // set KIMI_CONVERSATION_MODEL for K2.5 when available.
    model: {
      idle: process.env.KIMI_IDLE_MODEL || 'kimi-k2-0711-preview',
      conversation: process.env.KIMI_CONVERSATION_MODEL || 'kimi-k2-0711-preview',
    },
    skills: ['move', 'say', 'look', 'emote', 'wait'],
    spawn: { map: 'simplemap', x: 0, y: 0 },
    behavior: {
      idleInterval: 15000,
      patrolRadius: 3,
      greetOnProximity: true,
    },
  }
}

// ---------------------------------------------------------------------------
// NPC Event Class
// ---------------------------------------------------------------------------

@EventData({
  name: 'EV-AGENT-RUNNER-TEST',
  hitbox: { width: 32, height: 16 },
})
export default class AgentRunnerTestNpcEvent extends RpgEvent {
  private runner: AgentRunner | null = null

  onInit() {
    this.setGraphic('female')
    this.speed = 1
    this.frequency = 200

    console.log(`${LOG_PREFIX} onInit — building runner and registering with bridge...`)
    try {
      // 1. Build subsystems
      const perception = new PerceptionEngine()
      const registry = new SkillRegistry()
      registry.register(moveSkill)
      registry.register(saySkill)
      registry.register(createLookSkill(perception))
      registry.register(emoteSkill)
      registry.register(waitSkill)

      const memory = new InMemoryAgentMemory()
      const llmClient = new LLMClient()
      const config = createAgentConfig()

      // RunContext provider — closes over `this` (the RpgEvent)
      const getContext = async (event: AgentEvent): Promise<RunContext> => {
        return this.buildRunContext(event)
      }

      this.runner = new AgentRunner(
        config,
        perception,
        registry,
        memory,
        llmClient,
        getContext
      )

      // 2. Create LaneQueue and GameChannelAdapter
      const laneQueue = new LaneQueue()
      const adapter = new GameChannelAdapter({
        agentId: AGENT_ID,
        laneQueue,
        runner: this.runner,
        idleIntervalMs: config.behavior?.idleInterval ?? 15000,
        logPrefix: LOG_PREFIX,
      })

      // 3. Register with the shared bridge (starts idle timer automatically)
      bridge.registerAgent(this, AGENT_ID, adapter)

      console.log(`${LOG_PREFIX} Initialized — registered with bridge, idle every 15s, talk to trigger conversation`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Failed to init (missing MOONSHOT_API_KEY?):`, msg)
      this.runner = null
    }
  }

  /**
   * Forward player action to the bridge. The bridge routes to our adapter,
   * which builds the AgentEvent and enqueues runner.run().
   */
  async onAction(player: RpgPlayer) {
    // If this NPC isn't registered, show fallback text
    const agentId = bridge.getAgentId(this)
    if (!agentId) {
      await player.showText(
        'Agent runner not available. Set MOONSHOT_API_KEY in .env and restart.',
        { talkWith: this }
      )
      return
    }

    // Delegate to bridge → adapter → lane queue → runner
    bridge.handlePlayerAction(player, this)
  }

  // -----------------------------------------------------------------------
  // RunContext builder (still lives here in Option A — will be extracted
  // to a shared helper when AgentManager is built in Phase 4.2)
  // -----------------------------------------------------------------------

  private buildRunContext(event: AgentEvent | null): RunContext {
    const map = this.getCurrentMap<RpgMap>()
    const mapId = map?.id ?? 'unknown'
    const mapName = (map as { name?: string })?.name ?? mapId

    const position: Position = {
      x: this.position.x,
      y: this.position.y,
    }

    let nearbyPlayers: NearbyPlayerInfo[] = []
    // For player_action, resolve live player so say skill can showText
    if (event?.player) {
      try {
        const livePlayer = RpgWorld.getPlayer(event.player.id)
        if (livePlayer) {
          nearbyPlayers = [
            {
              player: livePlayer,
              name: livePlayer.name ?? event.player.name,
              distance: tileDistance(this.position, livePlayer.position),
            },
          ]
        }
      } catch {
        // Player may have disconnected
      }
    }
    if (nearbyPlayers.length === 0 && map) {
      try {
        const list = RpgWorld.getPlayersOfMap(mapId)
        const npcPos = this.position
        nearbyPlayers = list
          .filter((p) => p.id !== this.id)
          .map((p) => ({
            player: p,
            name: p.name ?? 'Player',
            distance: tileDistance(npcPos, p.position),
          }))
          .sort((a, b) => a.distance - b.distance)
      } catch {
        // Map may not be loaded
      }
    }

    const gameContext: GameContext = {
      event: this,
      agentId: AGENT_ID,
      position,
      map: { id: mapId, name: mapName },
      nearbyPlayers,
    }

    const rawEntities = this.getRawEntities(mapId)
    const perceptionContext: PerceptionContext = {
      agentId: AGENT_ID,
      position,
      map: { id: mapId, name: mapName },
      rawEntities,
    }

    return { perceptionContext, gameContext }
  }

  private getRawEntities(mapId: string): PerceptionContext['rawEntities'] {
    try {
      const objects = RpgWorld.getObjectsOfMap(mapId)
      return objects
        .filter((obj) => obj.id !== this.id)
        .filter(
          (obj) =>
            obj instanceof RpgPlayer ||
            obj.constructor.name.includes('Event')
        )
        .map((obj) => {
          const entityType = obj instanceof RpgPlayer ? 'player' : 'npc'
          return {
            id: obj.id ?? 'unknown',
            name: (obj as { name?: string }).name ?? 'Unknown',
            type: entityType as 'player' | 'npc' | 'object',
            position: {
              x: obj.position.x,
              y: obj.position.y,
              z: (obj.position as { z?: number }).z ?? 0,
            } as Position,
            distance: 0,
            direction: '',
          }
        })
    } catch {
      return []
    }
  }

  /**
   * Clean up: unregister from bridge (disposes adapter + timers)
   * and dispose the runner.
   */
  onDestroy() {
    bridge.unregisterAgent(this)

    if (this.runner) {
      void this.runner.dispose()
      this.runner = null
    }
  }
}
