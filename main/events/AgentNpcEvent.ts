/**
 * AgentNpcEvent — generic RpgEvent for YAML-driven AI NPCs
 *
 * Used by AgentManager for every agent loaded from src/config/agents/*.yaml.
 * In onInit() reads the spawn context (config + instance), binds the event's
 * buildRunContext to the instance's contextProvider, and registers with the bridge.
 */

import {
  RpgEvent,
  EventData,
  RpgPlayer,
  RpgWorld,
  type RpgMap,
} from '@rpgjs/server'
import { getAndClearSpawnContext } from '../../src/agents/core/spawnContext'
import { bridge } from '../../src/agents/bridge'
import type { AgentEvent, RunContext } from '../../src/agents/core/types'
import type { PerceptionContext } from '../../src/agents/perception/types'
import type { GameContext, NearbyPlayerInfo } from '../../src/agents/skills/types'
import type { Position } from '../../src/agents/bridge/types'

const TILE_SIZE = 32

function tileDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.round(Math.sqrt(dx * dx + dy * dy) / TILE_SIZE)
}

@EventData({
  name: 'EV-AGENT-NPC',
  hitbox: { width: 32, height: 16 },
})
export default class AgentNpcEvent extends RpgEvent {
  private agentId: string | null = null

  onInit() {
    const ctx = getAndClearSpawnContext()
    if (!ctx) {
      console.warn('[AgentNpcEvent] onInit called without spawn context — skipping bridge registration')
      return
    }
    const { config, instance } = ctx
    this.agentId = config.id
    this.setGraphic(config.graphic)
    this.speed = 1
    this.frequency = 200

    instance.contextProvider.getContext = async (event: AgentEvent): Promise<RunContext> => {
      return this.buildRunContext(event, config.id)
    }

    bridge.registerAgent(this, config.id, instance.adapter)
    console.log(`[AgentNpcEvent] Registered ${config.id} with bridge`)
  }

  async onAction(player: RpgPlayer) {
    const agentId = bridge.getAgentId(this)
    if (!agentId) {
      await player.showText('This NPC is not available right now.', { talkWith: this })
      return
    }
    bridge.handlePlayerAction(player, this)
  }

  onDestroy() {
    bridge.unregisterAgent(this)
    this.agentId = null
  }

  private buildRunContext(event: AgentEvent | null, agentId: string): RunContext {
    const map = this.getCurrentMap<RpgMap>()
    const mapId = map?.id ?? 'unknown'
    const mapName = (map as { name?: string })?.name ?? mapId

    const position: Position = {
      x: this.position.x,
      y: this.position.y,
    }

    let nearbyPlayers: NearbyPlayerInfo[] = []
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

    const defaultSpeechMode = event?.type === 'player_action' ? 'modal' : 'bubble'
    const gameContext: GameContext = {
      event: this,
      agentId,
      position,
      map: { id: mapId, name: mapName },
      nearbyPlayers,
      defaultSpeechMode,
    }

    const rawEntities = this.getRawEntities(mapId)
    const perceptionContext: PerceptionContext = {
      agentId,
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
            (obj as { constructor?: { name?: string } }).constructor?.name?.includes('Event')
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
}
