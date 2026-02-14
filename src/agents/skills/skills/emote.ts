/**
 * Emote Skill
 *
 * Allows the NPC to express emotions using emotion bubbles.
 * Requires @rpgjs/plugin-emotion-bubbles to be installed.
 */

import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'
import type { IAgentSkill, GameContext, SkillResult } from '../types'
import type { SkillPlugin } from '../plugin'

/**
 * Map of action strings to EmotionBubble enum values.
 */
const emotionMap: Record<string, EmotionBubble> = {
  wave: EmotionBubble.Happy,
  nod: EmotionBubble.Exclamation,
  shake_head: EmotionBubble.Cross,
  laugh: EmotionBubble.HaHa,
  think: EmotionBubble.ThreeDot,
}

export const emoteSkill: IAgentSkill = {
  name: 'emote',
  description:
    'Express an emotion or perform an action (wave, nod, shake_head, laugh, think)',
  parameters: {
    action: {
      type: 'string',
      description: 'The emotion or action to express',
      enum: ['wave', 'nod', 'shake_head', 'laugh', 'think'],
      required: true,
    },
  },
  async execute(params, context): Promise<SkillResult> {
    try {
      const action = String(params.action)

      // Look up emotion bubble
      const emotion = emotionMap[action]
      if (!emotion) {
        return {
          success: false,
          message: `Invalid action: ${action}. Must be one of: ${Object.keys(emotionMap).join(', ')}`,
          error: 'invalid_param',
        }
      }

      // Show emotion bubble on the NPC event
      // Note: RpgEvent extends RpgPlayer, so showEmotionBubble works directly
      // Type assertion needed because TypeScript doesn't know about the plugin method
      ;(context.event as any).showEmotionBubble(emotion)

      return {
        success: true,
        message: `Showed '${action}' emotion`,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `Emote failed: ${errorMessage}`,
        error: 'execution_error',
      }
    }
  },
}

// --- Skill Plugin (modular registration) ---
export const skillPlugin: SkillPlugin = {
  name: 'emote',
  create: () => emoteSkill,
  category: 'game',
}

