/**
 * Skill Plugin Types
 *
 * Defines the SkillPlugin interface for modular skill registration.
 * Each skill file exports a `skillPlugin` object; a static barrel file
 * (`plugins.ts`) re-exports them so AgentManager can discover skills
 * without a hardcoded map.
 *
 * MCP-inspired mental model (Discovery, Scoping, Capability Negotiation)
 * without literal MCP protocol overhead.
 *
 * @see .ai/idea/14-modular-skill-plugin-architecture.md
 */

import type { IAgentSkill } from './types'
import type { PerceptionEngine } from '../perception/PerceptionEngine'

/**
 * Runtime dependencies that factory-created skills can receive.
 * Passed by AgentManager when calling `plugin.create(deps)`.
 */
export interface SkillDependencies {
  perceptionEngine: PerceptionEngine
}

/**
 * A self-describing skill plugin.
 *
 * Adding a new skill = create the file, add a `skillPlugin` export,
 * then add one re-export line in `plugins.ts`. No other core edits.
 */
export interface SkillPlugin {
  /** Skill name — must match what's listed in AgentConfig.skills. */
  name: string

  /**
   * Factory to create the IAgentSkill instance.
   * - Zero-arg: skill has no dependencies (move, say, emote, wait).
   * - One-arg (SkillDependencies): skill needs runtime deps (look).
   */
  create: (() => IAgentSkill) | ((deps: SkillDependencies) => IAgentSkill)

  /** Inventory item that grants access to this skill (item-gated). */
  requiredItem?: string

  /** Env vars needed at runtime. Warn if missing but still register. */
  requiresEnv?: string[]

  /** Categorization for future UI/filtering. */
  category?: 'game' | 'api' | 'social' | 'knowledge'
}
