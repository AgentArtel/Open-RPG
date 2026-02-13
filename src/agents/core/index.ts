/**
 * Core Agent System — exports
 */

export { AgentRunner } from './AgentRunner'
export { LaneQueue } from './LaneQueue'
export { LLMClient } from './LLMClient'
export { AgentManager, setAgentNpcEventClass } from './AgentManager'
export { InMemoryAgentMemory } from '../memory/InMemoryAgentMemory'
export { createAgentMemory } from '../memory'

import { AgentManager } from './AgentManager'

/** Singleton AgentManager used by the game server (e.g. from main/player.ts). */
export const agentManager = new AgentManager()

export type {
  AgentConfig,
  AgentModelConfig,
  AgentSpawnConfig,
  AgentBehaviorConfig,
  AgentEvent,
  AgentRunResult,
  IAgentRunner,
  ILLMClient,
  ILaneQueue,
  LLMMessage,
  LLMContentBlock,
  LLMToolCall,
  LLMCompletionOptions,
  LLMResponse,
  RunContext,
  RunContextProvider,
  AgentInstance,
  IAgentManager,
} from './types'
