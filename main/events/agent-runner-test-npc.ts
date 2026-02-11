/**
 * Agent Runner Test NPC — Live integration test for the Core Agent System
 *
 * Runs AgentRunner with real LLM (Moonshot/Kimi) inside the game. You can see:
 * - Terminal: [AgentRunner:agent-runner-test] logs, run results, skill outputs
 * - Game: Say skill shows dialogue; move/emote/look affect the NPC
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
import type { AgentConfig, AgentEvent, RunContext } from '../../src/agents/core/types'
import type { PerceptionContext } from '../../src/agents/perception/types'
import type { GameContext, NearbyPlayerInfo } from '../../src/agents/skills/types'
import type { Position } from '../../src/agents/bridge/types'

const TILE_SIZE = 32
const LOG_PREFIX = '[AgentRunnerTestNPC]'
const AGENT_ID = 'agent-runner-test'

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
    // Default both to kimi-k2-0711-preview so conversation works; set KIMI_CONVERSATION_MODEL for K2.5 when available.
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

@EventData({
  name: 'EV-AGENT-RUNNER-TEST',
  hitbox: { width: 32, height: 16 },
})
export default class AgentRunnerTestNpcEvent extends RpgEvent {
  private runner: AgentRunner | null = null
  private laneQueue: LaneQueue | null = null
  private idleInterval: NodeJS.Timeout | null = null

  onInit() {
    this.setGraphic('female')
    this.speed = 1
    this.frequency = 200

    console.log(`${LOG_PREFIX} onInit — building runner and lane queue...`)
    try {
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
      this.laneQueue = new LaneQueue()

      console.log(`${LOG_PREFIX} Initialized — real LLM, idle every 15s, talk to trigger conversation`)

      this.idleInterval = setInterval(() => {
        this.enqueueIdleTick()
      }, 15000)

      // First idle tick after 3s so server can settle
      setTimeout(() => this.enqueueIdleTick(), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Failed to init (missing MOONSHOT_API_KEY?):`, msg)
      this.runner = null
      this.laneQueue = null
    }
  }

  async onAction(player: RpgPlayer) {
    if (!this.laneQueue || !this.runner) {
      await player.showText(
        'Agent runner not available. Set MOONSHOT_API_KEY in .env and restart.',
        { talkWith: this }
      )
      return
    }

    const event: AgentEvent = {
      type: 'player_action',
      timestamp: Date.now(),
      player: {
        id: player.id,
        name: player.name ?? 'Player',
        position: { x: player.position.x, y: player.position.y },
      },
    }

    console.log(`${LOG_PREFIX} enqueueing onAction`)
    this.laneQueue.enqueue(AGENT_ID, async () => {
      console.log(`${LOG_PREFIX} [onAction] task started, calling runner.run()...`)
      try {
        const result = await this.runner!.run(event)
        console.log(`${LOG_PREFIX} [onAction] success=${result.success} duration=${result.durationMs}ms`)
      if (result.text) console.log(`${LOG_PREFIX}   text: ${result.text}`)
      if (result.skillResults?.length) {
        result.skillResults.forEach((sr) => {
          console.log(`${LOG_PREFIX}   skill: ${sr.skillName} -> ${sr.result.message}`)
        })
      }
      if (result.error) console.error(`${LOG_PREFIX}   error: ${result.error}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${LOG_PREFIX} [onAction] run failed:`, msg)
      }
    })
  }

  private enqueueIdleTick() {
    if (!this.laneQueue || !this.runner) return

    const event: AgentEvent = {
      type: 'idle_tick',
      timestamp: Date.now(),
    }

    console.log(`${LOG_PREFIX} enqueueing idle tick`)
    this.laneQueue.enqueue(AGENT_ID, async () => {
      console.log(`${LOG_PREFIX} [idle] task started, calling runner.run()...`)
      try {
        const result = await this.runner!.run(event)
        console.log(`${LOG_PREFIX} [idle] success=${result.success} duration=${result.durationMs}ms`)
      if (result.text) console.log(`${LOG_PREFIX}   text: ${result.text}`)
      if (result.skillResults?.length) {
        result.skillResults.forEach((sr) => {
          console.log(`${LOG_PREFIX}   skill: ${sr.skillName} -> ${sr.result.message}`)
        })
      }
      if (result.error) console.error(`${LOG_PREFIX}   error: ${result.error}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${LOG_PREFIX} [idle] run failed:`, msg)
      }
    })
  }

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

  onDestroy() {
    if (this.idleInterval) {
      clearInterval(this.idleInterval)
      this.idleInterval = null
    }
    if (this.runner) {
      void this.runner.dispose()
      this.runner = null
    }
    this.laneQueue = null
  }
}
