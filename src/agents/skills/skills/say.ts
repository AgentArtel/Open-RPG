/**
 * Say Skill
 *
 * Allows the NPC to speak to a nearby player.
 */

import type { IAgentSkill, GameContext, SkillResult } from '../types'

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
  },
  async execute(params, context): Promise<SkillResult> {
    try {
      const message = String(params.message)
      const targetName = params.target ? String(params.target) : undefined

      // Find target player
      let targetPlayer = context.nearbyPlayers[0]?.player

      if (targetName) {
        // Search by name first
        const foundByName = context.nearbyPlayers.find(
          (p) => p.name === targetName
        )
        if (foundByName) {
          targetPlayer = foundByName.player
        } else {
          // Name not found, fall back to closest
          targetPlayer = context.nearbyPlayers[0]?.player
        }
      }

      if (!targetPlayer) {
        return {
          success: false,
          message: 'No player nearby to speak to',
          error: 'no_target',
        }
      }

      // Execute showText (blocking dialogue)
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

