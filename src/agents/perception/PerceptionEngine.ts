/**
 * PerceptionEngine Implementation
 *
 * Converts RPGJS game state into compact text snapshots for the LLM.
 * Handles distance/direction calculation, entity filtering, token budget
 * enforcement, and narrative summary generation.
 */

import { Vector2d } from '@rpgjs/common'
import type {
  IPerceptionEngine,
  PerceptionContext,
  PerceptionSnapshot,
  PerceptionLocation,
  NearbyEntity,
} from './types'
import { PERCEPTION_TOKEN_BUDGET, MAX_NEARBY_ENTITIES } from './types'
import type { Position } from '../bridge/types'

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Calculate distance between two positions in tiles.
 * Converts pixel distance to tile distance using the tile size.
 */
function calculateDistanceInTiles(
  npcPos: Position,
  targetPos: Position,
  tileSize: number = 32
): number {
  const npcVec = new Vector2d(npcPos.x, npcPos.y, 0)
  const targetVec = new Vector2d(targetPos.x, targetPos.y, 0)
  const pixelDistance = npcVec.distanceWith(targetVec)
  return Math.round(pixelDistance / tileSize)
}

/**
 * Calculate cardinal direction from NPC to target.
 * Returns one of 8 directions: north, northeast, east, southeast,
 * south, southwest, west, northwest.
 */
function calculateDirection(npcPos: Position, targetPos: Position): string {
  const dx = targetPos.x - npcPos.x
  const dy = targetPos.y - npcPos.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  // Normalize to 0-360 range
  const normalizedAngle = angle < 0 ? angle + 360 : angle

  // Map to 8 cardinals
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'east'
  if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'southeast'
  if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'south'
  if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'southwest'
  if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'west'
  if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'northwest'
  if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'north'
  return 'northeast' // 292.5 to 337.5
}

/**
 * Process and enrich entities with distance and direction.
 * Sorts by distance (closest first) and caps at MAX_NEARBY_ENTITIES.
 */
function processEntities(
  context: PerceptionContext,
  tileSize: number = 32
): NearbyEntity[] {
  const npcPos = context.position

  const enriched = context.rawEntities.map(entity => ({
    ...entity,
    distance: calculateDistanceInTiles(npcPos, entity.position, tileSize),
    direction: calculateDirection(npcPos, entity.position),
  }))

  // Sort by distance (closest first)
  enriched.sort((a, b) => a.distance - b.distance)

  // Cap at MAX_NEARBY_ENTITIES
  return enriched.slice(0, MAX_NEARBY_ENTITIES)
}

/**
 * Generate narrative summary in second person perspective.
 */
function generateSummary(entities: NearbyEntity[], mapName: string): string {
  if (entities.length === 0) {
    return `You are in ${mapName}. It is quiet.`
  }

  const first = entities[0]
  const restCount = entities.length - 1

  let description = `A ${first.type} named ${first.name} is ${first.direction} of you`

  if (restCount > 0) {
    description += `. ${restCount} other ${restCount === 1 ? 'entity' : 'entities'} ${restCount === 1 ? 'is' : 'are'} nearby`
  }

  return `You are in ${mapName}. ${description}.`
}

/**
 * Estimate token count using heuristic: 1 token ≈ 4 characters.
 */
function estimateTokens(
  summary: string,
  entities: NearbyEntity[],
  location: PerceptionLocation
): number {
  const summaryTokens = summary.length / 4
  const entitiesTokens = JSON.stringify(entities).length / 4
  const locationTokens = JSON.stringify(location).length / 4
  return Math.ceil(summaryTokens + entitiesTokens + locationTokens)
}

/**
 * Enforce token budget by trimming entities and/or truncating summary.
 */
function enforceTokenBudget(snapshot: PerceptionSnapshot): PerceptionSnapshot {
  if (snapshot.tokenEstimate <= PERCEPTION_TOKEN_BUDGET) {
    return snapshot
  }

  let entities = [...snapshot.entities]
  let summary = snapshot.summary

  // Trim entities from farthest
  while (entities.length > 0) {
    const tokens = estimateTokens(summary, entities, snapshot.location)

    if (tokens <= PERCEPTION_TOKEN_BUDGET) {
      return {
        ...snapshot,
        entities: entities,
        summary,
        tokenEstimate: tokens,
      }
    }

    entities.pop() // Remove farthest entity
  }

  // If still over budget, truncate summary
  const maxSummaryLength = PERCEPTION_TOKEN_BUDGET * 4 // 4 chars per token
  const truncatedSummary = summary.slice(0, maxSummaryLength - 3) + '...'

  const finalTokens = estimateTokens(truncatedSummary, [], snapshot.location)

  return {
    ...snapshot,
    entities: [],
    summary: truncatedSummary,
    tokenEstimate: finalTokens,
  }
}

// ---------------------------------------------------------------------------
// PerceptionEngine Class
// ---------------------------------------------------------------------------

/**
 * Stateless perception engine that converts game state to text snapshots.
 */
export class PerceptionEngine implements IPerceptionEngine {
  private readonly defaultTileSize = 32 // Standard RPGJS tile size

  async generateSnapshot(context: PerceptionContext): Promise<PerceptionSnapshot> {
    // Step 1: Process entities
    const entities = processEntities(context, this.defaultTileSize)

    // Step 2: Generate summary
    const mapName = context.map.name || context.map.id
    const summary = generateSummary(entities, mapName)

    // Step 3: Build location
    const location: PerceptionLocation = {
      map: context.map,
      position: context.position,
    }

    // Step 4: Create initial snapshot
    const initialSnapshot: Omit<PerceptionSnapshot, 'tokenEstimate'> = {
      summary,
      entities,
      location,
      timestamp: Date.now(),
    }

    // Step 5: Estimate tokens
    const tokenEstimate = estimateTokens(summary, entities, location)

    // Step 6: Enforce token budget
    const snapshot: PerceptionSnapshot = {
      ...initialSnapshot,
      tokenEstimate,
    }

    return enforceTokenBudget(snapshot)
  }
}

