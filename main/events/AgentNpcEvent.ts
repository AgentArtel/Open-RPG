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
import { getSupabaseClient } from '../../src/config/supabase'
import type { AgentEvent, RunContext } from '../../src/agents/core/types'
import type { PerceptionContext } from '../../src/agents/perception/types'
import type { GameContext, NearbyPlayerInfo } from '../../src/agents/skills/types'
import type { Position } from '../../src/agents/bridge/types'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

const TILE_SIZE = 32

/** Pending photo state per player (in-memory; keyed by player.id). */
interface PendingPhoto {
  status: 'pending' | 'ready' | 'failed'
  prompt?: string
  photoUrl?: string
  permanentUrl?: string
  errorCode?: string
}

const pendingPhotosByPlayerId = new Map<string, PendingPhoto>()

/** In-character error messages for photographer (matches generate_image skill). */
function photoErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'content_policy':
      return "I can't develop that image; my lens refuses."
    case 'no_result':
      return "The exposure came out blank... the light was wrong."
    case 'api_unavailable':
      return 'My darkroom chemicals have gone dry. Try again later.'
    case 'api_error':
      return 'Something went wrong in the darkroom. The film was ruined.'
    case 'timeout':
      return "The exposure took too long... the film was overexposed."
    default:
      return "The photograph did not turn out. Perhaps another time."
  }
}

/** Map photo-type choice to prompt for generate-image edge. */
const CHOICE_TO_PROMPT: Record<string, string> = {
  nature: 'a beautiful nature scene',
  portrait: 'a portrait in soft light',
  urban: 'an urban city scene',
  action: 'an action or sports moment',
  wildlife: 'a wildlife scene',
  architecture: 'striking architecture',
}

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

    // Grant inventory items (item-gated skill access, e.g. image-gen-token)
    if (config.inventory && config.inventory.length > 0) {
      for (const itemId of config.inventory) {
        try {
          ;(this as any).addItem(itemId)
        } catch (err) {
          console.warn(
            `[AgentNpcEvent] Failed to add item "${itemId}" to ${config.id}:`,
            err instanceof Error ? err.message : String(err)
          )
        }
      }
    }

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

    // Photographer: choice-only flow (Codecamp-style) — come back when ready
    if (agentId === 'photographer') {
      const pending = pendingPhotosByPlayerId.get(player.id)
      if (pending?.status === 'ready' && pending.photoUrl && pending.prompt !== undefined) {
        const seePhoto = await player.showChoices(
          'Do you want to see your photo?',
          [
            { text: 'Yes', value: 'yes' },
            { text: 'No', value: 'no' },
          ],
          { talkWith: this }
        )
        if (seePhoto?.value === 'no') {
          await player.showText("Alright. Come back when you'd like to see it.", { talkWith: this })
          return
        }
        if (seePhoto?.value === 'yes') {
          await player.showText(
            "Your photograph is ready. Here you are.",
            { talkWith: this }
          )
          const existing: Array<{ url: string; prompt: string; generatedBy: string; timestamp: number }> =
            player.getVariable('PHOTOS') || []
          const updated = [
            ...existing,
            {
              url: pending.photoUrl,
              prompt: pending.prompt,
              generatedBy: agentId,
              timestamp: Date.now(),
            },
          ]
          player.setVariable('PHOTOS', updated)
          try {
            player.gui('photo-result').open(
              {
                imageDataUrl: pending.photoUrl,
                permanentUrl: pending.permanentUrl ?? '',
                prompt: pending.prompt,
                title: 'Your photograph',
                description: pending.prompt,
              },
              { blockPlayerInput: true }
            )
          } catch (e) {
            console.warn('[Photographer] Could not open photo-result:', e)
          }
          pendingPhotosByPlayerId.delete(player.id)
        }
        return
      }
      if (pending?.status === 'failed') {
        await player.showText(photoErrorMessage(pending.errorCode ?? 'unknown'), { talkWith: this })
        pendingPhotosByPlayerId.delete(player.id)
        return
      }
      if (pending?.status === 'pending') {
        await player.showText("I'm still developing your photograph. Come back in a moment.", { talkWith: this })
        return
      }

      const choice = await player.showChoices(
        'Would you like me to take a photo?',
        [
          { text: 'Yes', value: 'yes' },
          { text: 'No, just chat', value: 'no' },
        ],
        { talkWith: this }
      )
      if (choice?.value === 'yes') {
        const styleChoice = await player.showChoices(
          'What kind of photo?',
          [
            { text: 'Nature', value: 'nature' },
            { text: 'Portrait', value: 'portrait' },
            { text: 'Urban / City', value: 'urban' },
            { text: 'Action / Sports', value: 'action' },
            { text: 'Wildlife', value: 'wildlife' },
            { text: 'Architecture', value: 'architecture' },
            { text: 'Cancel', value: 'cancel' },
          ],
          { talkWith: this }
        )
        if (styleChoice?.value && styleChoice.value !== 'cancel') {
          const prompt = CHOICE_TO_PROMPT[styleChoice.value] ?? 'a photograph'
          const style = 'vivid'
          pendingPhotosByPlayerId.set(player.id, { status: 'pending', prompt })
          await player.showText("I'll develop it in the darkroom. Come back when it's ready.", { talkWith: this })

          const supabase = getSupabaseClient()
          if (!supabase) {
            await player.showText("The lens is clouded today... I cannot focus.", { talkWith: this })
            pendingPhotosByPlayerId.delete(player.id)
            return
          }

          const playerId = player.id
          const timeoutMs = 60_000
          const invokePromise = supabase.functions.invoke('generate-image', {
            body: { prompt, style, agentId },
          })
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeoutMs)
          )
          Promise.race([invokePromise, timeoutPromise])
            .then((response: { data: unknown; error: unknown }) => {
              if (response.error) {
                pendingPhotosByPlayerId.set(playerId, { status: 'failed', errorCode: 'api_error' })
                console.warn('[Photographer] Edge invoke error:', response.error)
                return
              }
              const edgeData = response.data as {
                success?: boolean
                imageDataUrl?: string
                imageUrl?: string
                permanentUrl?: string
                error?: string
              } | null
              if (edgeData?.success === true && (edgeData.imageDataUrl || edgeData.imageUrl)) {
                const photoUrl = edgeData.imageDataUrl || edgeData.imageUrl!
                pendingPhotosByPlayerId.set(playerId, {
                  status: 'ready',
                  prompt,
                  photoUrl,
                  permanentUrl: edgeData.permanentUrl,
                })
                const event = bridge.getEventByAgentId('photographer')
                if (event) {
                  try {
                    ;(event as any).showEmotionBubble?.(EmotionBubble.Exclamation)
                  } catch {
                    // plugin may be missing
                  }
                }
              } else {
                pendingPhotosByPlayerId.set(playerId, {
                  status: 'failed',
                  errorCode: edgeData?.error ?? 'unknown',
                })
              }
            })
            .catch((err: unknown) => {
              const code = err instanceof Error && err.message === 'timeout' ? 'timeout' : 'api_error'
              pendingPhotosByPlayerId.set(playerId, { status: 'failed', errorCode: code })
              console.warn('[Photographer] Background job failed', err)
            })
          return
        }
        // Cancel or no value — fall through to normal chat
      }
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
