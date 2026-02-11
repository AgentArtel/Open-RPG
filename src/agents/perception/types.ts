/**
 * Perception Engine Types
 *
 * Defines how the game world is translated into text that the LLM can
 * understand.  The perception engine reads RPGJS state and produces a
 * compact, structured snapshot that fits within a strict token budget.
 *
 * Architecture decision (from AGENTS.md):
 *   "Structured hybrid — JSON state + brief narrative summary, ~150 tokens"
 *
 * Hard constraint: every snapshot must be < 300 tokens.
 */

import type { Position, MapInfo } from '../bridge/types';

// ---------------------------------------------------------------------------
// NearbyEntity — something the NPC can perceive
// ---------------------------------------------------------------------------

/** The kind of entity the NPC perceives. */
export type EntityType = 'player' | 'npc' | 'object';

/**
 * A single entity within the NPC's perception radius.
 *
 * Contains only the information the LLM needs to make decisions —
 * no raw pixel coordinates or internal RPGJS IDs.
 */
export interface NearbyEntity {
  /** A stable identifier for the entity. */
  readonly id: string;

  /** Display name (e.g. "YourName", "Elder Theron", "Chest"). */
  readonly name: string;

  /** What kind of entity this is. */
  readonly type: EntityType;

  /** Tile-based position on the map. */
  readonly position: Position;

  /**
   * Approximate distance from the NPC, in tiles.
   * Used for ordering and filtering (closest first).
   */
  readonly distance: number;

  /**
   * Cardinal direction from the NPC to this entity.
   * More useful to the LLM than raw coordinates.
   *
   * @example "north", "southeast"
   */
  readonly direction: string;
}

// ---------------------------------------------------------------------------
// PerceptionSnapshot — the full snapshot sent to the LLM
// ---------------------------------------------------------------------------

/**
 * A complete perception snapshot that describes the NPC's current
 * awareness of the game world.
 *
 * Format: structured hybrid
 *   - `entities` and `location` provide machine-readable state
 *   - `summary` provides a one-line narrative anchor for the LLM
 *
 * Token budget: the entire snapshot (when serialized for the prompt)
 * MUST stay under 300 tokens.  The `tokenEstimate` field tracks this.
 */
export interface PerceptionSnapshot {
  /**
   * One-line narrative summary of the NPC's surroundings.
   * Written in second person from the NPC's perspective.
   *
   * @example "You are standing in a grassy clearing. A player named
   *           Alex approaches from the east. It is quiet."
   */
  readonly summary: string;

  /**
   * Entities the NPC can currently perceive, sorted by distance
   * (closest first).  Capped at 5 to stay within token budget.
   */
  readonly entities: ReadonlyArray<NearbyEntity>;

  /**
   * Where the NPC currently is.
   */
  readonly location: PerceptionLocation;

  /** Unix-ms timestamp of when this snapshot was generated. */
  readonly timestamp: number;

  /**
   * Estimated token count for this snapshot when serialized.
   * Implementations MUST ensure this stays below
   * {@link PERCEPTION_TOKEN_BUDGET}.
   */
  readonly tokenEstimate: number;
}

/**
 * The NPC's current location context.
 */
export interface PerceptionLocation {
  /** Map metadata. */
  readonly map: MapInfo;
  /** NPC's tile-based position. */
  readonly position: Position;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum number of tokens a perception snapshot may occupy.
 * Enforced by the perception engine implementation.
 */
export const PERCEPTION_TOKEN_BUDGET = 300;

/**
 * Maximum number of nearby entities included in a snapshot.
 * Keeps the token count manageable.
 */
export const MAX_NEARBY_ENTITIES = 5;

// ---------------------------------------------------------------------------
// IPerceptionEngine — converts game state to text for the LLM
// ---------------------------------------------------------------------------

/**
 * Converts raw RPGJS game state into a compact text snapshot
 * that fits within the token budget.
 *
 * The perception engine is stateless — it reads the current game
 * state on each call and produces a fresh snapshot.
 *
 * Usage:
 *   1. Bridge layer calls `generateSnapshot(context)` before each LLM call
 *   2. Snapshot is injected into the system prompt or user message
 *   3. LLM uses the snapshot to understand its surroundings
 *
 * @see AGENTS.md — "Perception snapshots target < 300 tokens"
 */
export interface IPerceptionEngine {
  /**
   * Generate a perception snapshot for the given context.
   *
   * The implementation must:
   *   - Query nearby entities from the RPGJS map
   *   - Cap entities at {@link MAX_NEARBY_ENTITIES}
   *   - Generate a narrative summary
   *   - Estimate token count and ensure < {@link PERCEPTION_TOKEN_BUDGET}
   *   - If over budget, trim entities or shorten summary
   *
   * @param context - The perception context providing game state access.
   * @returns A snapshot that fits within the token budget.
   */
  generateSnapshot(context: PerceptionContext): Promise<PerceptionSnapshot>;
}

/**
 * Input context for generating a perception snapshot.
 * Constructed by the bridge layer from the NPC's current game state.
 */
export interface PerceptionContext {
  /** The agent identifier. */
  readonly agentId: string;
  /** The NPC's current tile position. */
  readonly position: Position;
  /** The map the NPC is on. */
  readonly map: MapInfo;
  /** All entities within the perception radius (pre-filtered by bridge). */
  readonly rawEntities: ReadonlyArray<NearbyEntity>;
}

