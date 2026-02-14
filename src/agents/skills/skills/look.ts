/**
 * Look Skill
 *
 * Allows the NPC to observe surroundings and generate a perception snapshot.
 * Uses closure pattern to inject PerceptionEngine dependency.
 */

import { RpgWorld, RpgPlayer } from '@rpgjs/server'
import type { IAgentSkill, GameContext, SkillResult } from '../types'
import type { IPerceptionEngine, PerceptionContext } from '../../perception/types'
import type { Position } from '../../bridge/types'
import type { SkillPlugin, SkillDependencies } from '../plugin'

/**
 * Create a look skill that uses the provided PerceptionEngine.
 *
 * @param perceptionEngine - The PerceptionEngine instance to use.
 * @returns An IAgentSkill for observing surroundings.
 */
export function createLookSkill(
  perceptionEngine: IPerceptionEngine
): IAgentSkill {
  return {
    name: 'look',
    description: 'Observe your surroundings and nearby entities',
    parameters: {},
    async execute(params, context): Promise<SkillResult> {
      try {
        // Get all objects on the map (players + events)
        const objects = RpgWorld.getObjectsOfMap(context.map.id)

        // Convert RPGJS objects to rawEntities format
        const rawEntities = objects
          .filter((obj) => {
            // Exclude self
            if (obj.id === context.event.id) {
              return false
            }

            // Only include players and events (not shapes)
            // RpgWorld.getObjectsOfMap returns RpgPlayer[] which includes events
            return obj instanceof RpgPlayer
          })
          .map((obj) => {
            // Determine entity type: if it's an event (not a real player), it's an NPC
            // We can't easily distinguish events from players via instanceof,
            // so we'll treat all as 'player' for now (the perception engine will handle it)
            const entityType: 'player' | 'npc' | 'object' = 'player'
            return {
              id: obj.id || 'unknown',
              name: obj.name || 'Unknown',
              type: entityType,
              position: {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z || 0,
              } as Position,
              // These will be calculated by PerceptionEngine
              distance: 0,
              direction: '',
            }
          })

        // Build PerceptionContext
        const perceptionContext: PerceptionContext = {
          agentId: context.agentId,
          position: context.position,
          map: context.map,
          rawEntities,
        }

        // Generate perception snapshot
        const snapshot = await perceptionEngine.generateSnapshot(
          perceptionContext
        )

        return {
          success: true,
          message: snapshot.summary,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          message: `Look failed: ${errorMessage}`,
          error: 'execution_error',
        }
      }
    },
  }
}

// --- Skill Plugin (modular registration, factory pattern) ---
export const skillPlugin: SkillPlugin = {
  name: 'look',
  create: (deps: SkillDependencies) => createLookSkill(deps.perceptionEngine),
  category: 'game',
}

