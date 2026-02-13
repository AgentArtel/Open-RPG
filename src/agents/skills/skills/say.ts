/**
 * Say Skill
 *
 * Allows the NPC to speak to a nearby player.
 * Supports modal (blocking) dialogue or floating speech bubble (non-blocking).
 */

import { inject, RpgServerEngine } from '@rpgjs/server'
import type { IAgentSkill, GameContext, SkillResult } from '../types'

/** Simple content blocklist; message containing these is not displayed. */
const BLOCKED_PATTERNS = /profanity|slur|explicit/i

export const saySkill: IAgentSkill = {
  name: 'say',
  description: 'Speak to a nearby player',
  parameters: {
    message: {
      type: 'string',
      description: 'What to say to the player',
      required: true,
    },
    target: {
      type: 'string',
      description: 'Name of the player to speak to (optional, defaults to closest player)',
      required: false,
    },
    mode: {
      type: 'string',
      description: 'Speech mode: "modal" for full dialogue, "bubble" for floating text above NPC',
      enum: ['modal', 'bubble'],
      required: false,
    },
  },
  async execute(params, context): Promise<SkillResult> {
    try {
      const message = String(params.message)
      if (BLOCKED_PATTERNS.test(message)) {
        return {
          success: false,
          message: 'Message blocked by content policy',
          error: 'content_policy',
        }
      }

      const mode = (params.mode ?? context.defaultSpeechMode ?? 'modal') as 'modal' | 'bubble'
      const targetName = params.target ? String(params.target) : undefined

      // Find target player (needed for modal; bubble broadcasts to all)
      let targetPlayer = context.nearbyPlayers[0]?.player
      if (targetName) {
        const foundByName = context.nearbyPlayers.find(
          (p) => p.name === targetName
        )
        if (foundByName) {
          targetPlayer = foundByName.player
        } else {
          targetPlayer = context.nearbyPlayers[0]?.player
        }
      }

      if (mode === 'bubble') {
        try {
          const engine = inject(RpgServerEngine)
          if (engine?.io) {
            engine.io.emit('npc-bubble:show', {
              spriteId: context.event.id,
              npcName: context.agentId,
              message,
            })
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e)
          return {
            success: false,
            message: `Bubble emit failed: ${errMsg}`,
            error: 'execution_error',
          }
        }
        return {
          success: true,
          message: `Said (bubble): "${message}"`,
        }
      }

      if (!targetPlayer) {
        return {
          success: false,
          message: 'No player nearby to speak to',
          error: 'no_target',
        }
      }

      await targetPlayer.showText(message, { talkWith: context.event })

      const targetInfo = targetName
        ? ` to ${targetName}`
        : targetPlayer.name
          ? ` to ${targetPlayer.name}`
          : ''

      return {
        success: true,
        message: `Said: "${message}"${targetInfo}`,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `Say failed: ${errorMessage}`,
        error: 'execution_error',
      }
    }
  },
}

