/**
 * Wait Skill
 *
 * Allows the NPC to wait/pause for a specified duration.
 */

import type { IAgentSkill, GameContext, SkillResult } from '../types'
import type { SkillPlugin } from '../plugin'

const DEFAULT_DURATION_MS = 2000
const MAX_DURATION_MS = 10000

export const waitSkill: IAgentSkill = {
  name: 'wait',
  description: 'Wait for a moment (idle/thinking). Default 2 seconds, max 10 seconds.',
  parameters: {
    durationMs: {
      type: 'number',
      description: 'Duration to wait in milliseconds (default: 2000, max: 10000)',
      required: false,
      default: DEFAULT_DURATION_MS,
    },
  },
  async execute(params, context): Promise<SkillResult> {
    try {
      // Get duration with default
      const durationMs =
        params.durationMs !== undefined
          ? Number(params.durationMs)
          : DEFAULT_DURATION_MS

      // Validate duration
      if (isNaN(durationMs) || durationMs < 0) {
        return {
          success: false,
          message: `Invalid duration: ${durationMs}. Must be a positive number`,
          error: 'invalid_param',
        }
      }

      if (durationMs > MAX_DURATION_MS) {
        return {
          success: false,
          message: `Duration too long: ${durationMs}ms. Maximum is ${MAX_DURATION_MS}ms`,
          error: 'invalid_param',
        }
      }

      // Wait for the specified duration
      await new Promise((resolve) => setTimeout(resolve, durationMs))

      const seconds = (durationMs / 1000).toFixed(1)
      return {
        success: true,
        message: `Waited for ${seconds} seconds`,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `Wait failed: ${errorMessage}`,
        error: 'execution_error',
      }
    }
  },
}

// --- Skill Plugin (modular registration) ---
export const skillPlugin: SkillPlugin = {
  name: 'wait',
  create: () => waitSkill,
  category: 'game',
}

