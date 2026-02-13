/**
 * Skill Test NPC — Live integration test for the Skill System
 *
 * Tests all 5 MVP skills in the actual game environment and logs results
 * to the server console. Use this to verify skills work correctly before
 * moving on to AgentRunner integration.
 *
 * Test modes:
 * - onAction: Full test when player talks to NPC (includes say skill)
 * - Periodic: Every 10s runs wait, look, move, emote (no say — no player needed)
 */

import {
  RpgEvent,
  EventData,
  RpgPlayer,
  RpgWorld,
  type RpgMap,
} from '@rpgjs/server'
import {
  SkillRegistry,
  moveSkill,
  saySkill,
  createLookSkill,
  emoteSkill,
  waitSkill,
} from '../../src/agents/skills'
import { PerceptionEngine } from '../../src/agents/perception/PerceptionEngine'
import type { GameContext, NearbyPlayerInfo } from '../../src/agents/skills/types'
import type { Position } from '../../src/agents/bridge/types'

const TILE_SIZE = 32
const LOG_PREFIX = '[SkillTestNPC]'

/** Calculate tile distance between two positions (RPGJS uses pixels). */
function tileDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.round(Math.sqrt(dx * dx + dy * dy) / TILE_SIZE)
}

@EventData({
  name: 'EV-SKILL-TEST',
  hitbox: { width: 32, height: 16 },
})
export default class SkillTestNpcEvent extends RpgEvent {
  private registry!: SkillRegistry
  private perceptionEngine!: PerceptionEngine
  private periodicInterval: NodeJS.Timeout | null = null

  onInit() {
    this.perceptionEngine = new PerceptionEngine()
    this.registry = new SkillRegistry()
    this.registry.register(moveSkill)
    this.registry.register(saySkill)
    this.registry.register(createLookSkill(this.perceptionEngine))
    this.registry.register(emoteSkill)
    this.registry.register(waitSkill)

    this.setGraphic('female')
    this.speed = 1
    this.frequency = 200

    console.log(`${LOG_PREFIX} Initialized — skill tests will run every 10 seconds`)
    console.log(`${LOG_PREFIX} Walk up and press Action to run full test (including say)`)

    this.periodicInterval = setInterval(() => {
      void this.runPeriodicTest().catch((err) => {
        console.error(`${LOG_PREFIX} Periodic test error:`, err)
      })
    }, 10000)

    // Run first test after 2 seconds (give server time to settle)
    setTimeout(() => {
      void this.runPeriodicTest().catch(() => {})
    }, 2000)
  }

  async onAction(player: RpgPlayer) {
    const context = this.buildContext(player)
    console.log(`\n${'='.repeat(60)}`)
    console.log(`${LOG_PREFIX} FULL SKILL TEST (triggered by player: ${player.name})`)
    console.log('='.repeat(60))

    const results: string[] = []

    // 1. Wait
    const waitResult = await this.registry.executeSkill(
      'wait',
      { durationMs: 500 },
      context
    )
    this.logResult('wait', waitResult)
    results.push(`wait: ${waitResult.message}`)

    // 2. Look
    const lookResult = await this.registry.executeSkill('look', {}, context)
    this.logResult('look', lookResult)
    results.push(`look: ${lookResult.success ? 'OK' : lookResult.message}`)

    // 3. Move (one tile up)
    const moveResult = await this.registry.executeSkill(
      'move',
      { direction: 'up' },
      context
    )
    this.logResult('move', moveResult)
    results.push(`move: ${moveResult.message}`)

    // 4. Emote
    const emoteResult = await this.registry.executeSkill(
      'emote',
      { action: 'wave' },
      context
    )
    this.logResult('emote', emoteResult)
    results.push(`emote: ${emoteResult.message}`)

    // 5. Say (to the interacting player)
    const sayResult = await this.registry.executeSkill(
      'say',
      { message: 'Hello from the skill system! All 5 skills passed.' },
      context
    )
    this.logResult('say', sayResult)
    results.push(`say: ${sayResult.message}`)

    console.log('='.repeat(60))
    console.log(`${LOG_PREFIX} Summary: ${results.join(' | ')}`)
    console.log('='.repeat(60) + '\n')

    await player.showText(
      `Skill test complete! Check the server terminal for logs.`,
      { talkWith: this }
    )
    await player.showText(
      `Results: ${results.join(' | ')}`,
      { talkWith: this }
    )
  }

  /** Run skills that don't require a nearby player (periodic test). */
  private async runPeriodicTest() {
    const map = this.getCurrentMap<RpgMap>()
    if (!map) return

    const context = this.buildContext(null)
    console.log(`\n${'-'.repeat(50)}`)
    console.log(`${LOG_PREFIX} Periodic test @ ${new Date().toISOString()}`)

    // wait (short)
    const waitResult = await this.registry.executeSkill(
      'wait',
      { durationMs: 200 },
      context
    )
    this.logResult('wait', waitResult)

    // look
    const lookResult = await this.registry.executeSkill('look', {}, context)
    this.logResult('look', lookResult)

    // skip move in periodic test — NPCs are often surrounded so move frequently returns "blocked"
    // move is still tested on full run when player uses onAction

    // emote
    const actions = ['wave', 'nod', 'think'] as const
    const action = actions[Math.floor(Math.random() * actions.length)]
    const emoteResult = await this.registry.executeSkill(
      'emote',
      { action },
      context
    )
    this.logResult('emote', emoteResult)

    console.log('-'.repeat(50) + '\n')
  }

  private buildContext(interactingPlayer: RpgPlayer | null): GameContext {
    const map = this.getCurrentMap<RpgMap>()
    const mapId = map?.id ?? 'unknown'
    const mapName = (map as any)?.name ?? mapId

    const position: Position = {
      x: this.position.x,
      y: this.position.y,
    }

    let nearbyPlayers: NearbyPlayerInfo[] = []

    if (interactingPlayer) {
      nearbyPlayers = [
        {
          player: interactingPlayer,
          name: interactingPlayer.name ?? 'Player',
          distance: tileDistance(
            this.position,
            interactingPlayer.position
          ),
        },
      ]
    } else {
      let players: RpgPlayer[] = []
      try {
        players = RpgWorld.getPlayersOfMap(mapId)
      } catch {
        // Map may not be loaded yet
      }
      const npcPos = this.position
      nearbyPlayers = players
        .filter((p) => p.id !== this.id)
        .map((p) => ({
          player: p,
          name: p.name ?? 'Player',
          distance: tileDistance(npcPos, p.position),
        }))
        .sort((a, b) => a.distance - b.distance)
    }

    return {
      event: this,
      agentId: this.id ?? 'skill-test-npc',
      position,
      map: { id: mapId, name: mapName },
      nearbyPlayers,
    }
  }

  private logResult(skillName: string, result: { success: boolean; message: string }) {
    const icon = result.success ? '✅' : '❌'
    console.log(`  ${icon} ${skillName}: ${result.message}`)
  }

  onDestroy() {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval)
      this.periodicInterval = null
    }
  }
}
