/**
 * Move Skill
 *
 * Allows the NPC to move one tile in a direction (up, down, left, right).
 */

import { Move } from '@rpgjs/server'
import type { IAgentSkill, GameContext, SkillResult } from '../types'

export const moveSkill: IAgentSkill = {
  name: 'move',
  description: 'Move one tile in a direction (up, down, left, right)',
  parameters: {
    direction: {
      type: 'string',
      description: 'Direction to move',
      enum: ['up', 'down', 'left', 'right'],
      required: true,
    },
  },
  async execute(params, context): Promise<SkillResult> {
    try {
      const direction = String(params.direction)

      // Map direction strings to RPGJS Move functions
      let move: ReturnType<typeof Move.tileUp>
      switch (direction) {
        case 'up':
          move = Move.tileUp()
          break
        case 'down':
          move = Move.tileDown()
          break
        case 'left':
          move = Move.tileLeft()
          break
        case 'right':
          move = Move.tileRight()
          break
        default:
          return {
            success: false,
            message: `Invalid direction: ${direction}. Must be one of: up, down, left, right`,
            error: 'invalid_param',
          }
      }

      // Execute movement. moveRoutes returns false when the target tile is blocked (collision) or movement fails.
      const moved = await context.event.moveRoutes([move as any])

      if (!moved) {
        return {
          success: false,
          message: 'Could not move (tile blocked or occupied)',
          error: 'blocked',
        }
      }

      // Convert direction to cardinal name for message
      const directionNames: Record<string, string> = {
        up: 'north',
        down: 'south',
        left: 'west',
        right: 'east',
      }

      const cardinalName = directionNames[direction] || direction
      return {
        success: true,
        message: `Moved one tile ${cardinalName}`,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `Move failed: ${errorMessage}`,
        error: 'execution_error',
      }
    }
  },
}

