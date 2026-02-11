/**
 * Skill System Module Exports
 */

// Registry
export { SkillRegistry } from './SkillRegistry'

// Skills
export { moveSkill } from './skills/move'
export { saySkill } from './skills/say'
export { createLookSkill } from './skills/look'
export { emoteSkill } from './skills/emote'
export { waitSkill } from './skills/wait'

// Types
export type {
  IAgentSkill,
  ISkillRegistry,
  SkillResult,
  GameContext,
  NearbyPlayerInfo,
  SkillParameterSchema,
  OpenAIToolDefinition,
  ToolDefinition, // Legacy, kept for reference
} from './types'

