/**
 * Core Agent System Types
 *
 * Defines the top-level interfaces that wire the agent system together:
 * the agent runner (LLM loop), agent manager (multi-NPC orchestration),
 * lane queue (serial execution), LLM client (provider abstraction), and
 * the declarative agent configuration format.
 *
 * Pattern: OpenClaw Agent Runner + Lane Queue
 * Reference: docs/openclaw-patterns.md — Patterns 1 & 2
 *            docs/openclaw-reference/src/agents/pi-embedded-runner/run.ts
 *            docs/openclaw-reference/src/process/command-queue.ts
 */

import type { AgentEvent, Position, MapInfo } from '../bridge/types';
import type { ISkillRegistry, ToolDefinition, SkillResult, GameContext } from '../skills/types';
import type { IPerceptionEngine, PerceptionSnapshot, PerceptionContext } from '../perception/types';
import type { IAgentMemory, MemoryEntry } from '../memory/types';
import type { OpenAIToolDefinition } from '../skills/types';

// Re-export AgentEvent so consumers can import everything from core/types
export type { AgentEvent } from '../bridge/types';

// ---------------------------------------------------------------------------
// AgentConfig — declarative NPC personality loaded from YAML
// ---------------------------------------------------------------------------

/**
 * Model configuration for an agent.
 * Supports tiered models: fast model for idle, powerful model for conversation.
 */
export interface AgentModelConfig {
  /**
   * Model used for idle-tick behavior (cheaper, faster).
   * @example "kimi-k2-0711-preview"
   */
  readonly idle: string;

  /**
   * Model used for player conversations (more capable).
   * @example "kimi-k2.5-202501"
   */
  readonly conversation: string;
}

/**
 * Spawn location for an NPC on the game map.
 */
export interface AgentSpawnConfig {
  /** Map identifier where the NPC spawns. */
  readonly map: string;
  /** Tile X coordinate. */
  readonly x: number;
  /** Tile Y coordinate. */
  readonly y: number;
}

/**
 * Behavioral tuning knobs for an NPC.
 */
export interface AgentBehaviorConfig {
  /**
   * Milliseconds between idle ticks.
   * @default 15000
   */
  readonly idleInterval: number;

  /**
   * Maximum number of tiles the NPC will wander from its spawn point.
   * @default 3
   */
  readonly patrolRadius: number;

  /**
   * Whether the NPC should greet players who enter its detection shape.
   * @default true
   */
  readonly greetOnProximity: boolean;
}

/**
 * Complete declarative configuration for an AI NPC agent.
 * Loaded from a YAML file in `src/config/agents/`.
 *
 * @example
 * ```yaml
 * id: elder-theron
 * name: Elder Theron
 * graphic: npc-elder
 * personality: |
 *   You are Elder Theron, the wise village elder...
 * model:
 *   idle: kimi-k2-0711-preview
 *   conversation: kimi-k2.5-202501
 * skills: [say, move, look, emote, wait]
 * spawn:
 *   map: simplemap
 *   x: 300
 *   y: 200
 * behavior:
 *   idleInterval: 15000
 *   patrolRadius: 3
 *   greetOnProximity: true
 * ```
 *
 * @see docs/openclaw-patterns.md — Configuration Pattern
 * @see docs/openclaw-reference/src/config/types.agents.ts
 */
export interface AgentConfig {
  /** Unique agent identifier (used as the lane queue key). */
  readonly id: string;

  /** Display name shown above the NPC sprite. */
  readonly name: string;

  /** RPGJS spritesheet graphic ID (e.g. "female", "npc-elder"). */
  readonly graphic: string;

  /**
   * System prompt personality block.
   * Injected into the LLM system prompt as the NPC's identity.
   */
  readonly personality: string;

  /** Model configuration (tiered: idle vs. conversation). */
  readonly model: AgentModelConfig;

  /**
   * List of skill names this agent is allowed to use.
   * Must match registered skill names in the ISkillRegistry.
   */
  readonly skills: ReadonlyArray<string>;

  /** Where to spawn the NPC. */
  readonly spawn: AgentSpawnConfig;

  /** Behavioral tuning. */
  readonly behavior: AgentBehaviorConfig;

  /**
   * Items the NPC spawns with (granted via addItem in onInit).
   * Used for item-gated skill access (e.g. 'image-gen-token' for generate_image).
   */
  readonly inventory?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// RunContext — provided to AgentRunner for each run (bridge supplies this)
// ---------------------------------------------------------------------------

/**
 * Game state needed for one agent run. The bridge (Phase 4) builds this
 * from the NPC's RpgEvent; tests pass a mock.
 */
export interface RunContext {
  /** For PerceptionEngine.generateSnapshot. */
  readonly perceptionContext: PerceptionContext;
  /** For SkillRegistry.executeSkill. */
  readonly gameContext: GameContext;
}

/**
 * Called at the start of each run to get current game state.
 * The bridge implements this; tests use a static mock.
 */
export type RunContextProvider = (event: AgentEvent) => Promise<RunContext>;

// ---------------------------------------------------------------------------
// LLM Client — provider-agnostic interface
// ---------------------------------------------------------------------------

/**
 * A message in the LLM conversation format.
 * Closely mirrors the Moonshot AI Chat API structure.
 */
export interface LLMMessage {
  /** Message role. */
  readonly role: 'user' | 'assistant';
  /** Message content (text or structured content blocks). */
  readonly content: string | ReadonlyArray<LLMContentBlock>;
}

/** A content block within an LLM message. */
export type LLMContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: Record<string, unknown> }
  | { readonly type: 'tool_result'; readonly tool_use_id: string; readonly content: string };

/**
 * A tool call returned by the LLM.
 */
export interface LLMToolCall {
  /** Unique ID for this tool invocation (used to match tool_result). */
  readonly id: string;
  /** The tool/skill name the LLM wants to invoke. */
  readonly name: string;
  /** The parameters the LLM provided. */
  readonly input: Record<string, unknown>;
}

/**
 * Options for an LLM completion request.
 */
export interface LLMCompletionOptions {
  /** Which model to use for this call. */
  readonly model: string;
  /** Maximum tokens to generate. */
  readonly maxTokens?: number;
  /** System prompt (identity, skills, perception, rules). */
  readonly systemPrompt?: string;
  /** Tool definitions (OpenAI format for Kimi K2/K2.5). */
  readonly tools?: ReadonlyArray<OpenAIToolDefinition>;
  /** Temperature (0.0 – 1.0). Lower = more deterministic. */
  readonly temperature?: number;
}

/**
 * The response from an LLM completion call.
 */
export interface LLMResponse {
  /** Text content returned by the LLM (may be empty if tool calls). */
  readonly text: string;
  /** Tool calls the LLM wants to make (empty if pure text response). */
  readonly toolCalls: ReadonlyArray<LLMToolCall>;
  /** Why the model stopped generating. */
  readonly stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  /** Usage metadata for cost tracking. */
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

/**
 * Provider-agnostic LLM client interface.
 *
 * The primary implementation wraps `@moonshot-ai/moonshot-sdk`, but the interface
 * is designed so alternative providers can be swapped in without changing
 * the agent runner.
 *
 * @see docs/openclaw-patterns.md — Pattern 2: Agent Runner
 */
export interface ILLMClient {
  /**
   * Send a completion request to the LLM.
   *
   * @param messages - Conversation history.
   * @param options  - Model, tools, system prompt, etc.
   * @returns The LLM's response (text and/or tool calls).
   * @throws On network errors, auth errors, or rate limits.
   *         Callers MUST catch and handle gracefully.
   */
  complete(
    messages: ReadonlyArray<LLMMessage>,
    options: LLMCompletionOptions,
  ): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// ILaneQueue — per-agent serial execution queue
// ---------------------------------------------------------------------------

/**
 * Async serial execution queue keyed by agent ID.
 *
 * Ensures that each NPC processes one task at a time while multiple
 * NPCs run in parallel.  Prevents race conditions in per-NPC state
 * (memory, conversation, movement).
 *
 * When a player talks to an NPC, the conversation request is enqueued.
 * If another player approaches while the NPC is processing, their
 * request waits.  Idle ticks also go through the lane.
 *
 * @example
 * ```ts
 * await laneQueue.enqueue('elder-theron', async () => {
 *   const result = await agentRunner.run(event);
 *   await executeSkills(result.toolCalls);
 * });
 * ```
 *
 * @see docs/openclaw-patterns.md — Pattern 1: Lane Queue
 * @see docs/openclaw-reference/src/process/command-queue.ts
 */
export interface ILaneQueue {
  /**
   * Enqueue a task for the given agent.
   * The task will execute after all previously enqueued tasks for
   * the same agent have completed.
   *
   * @param agentId - The agent's lane identifier.
   * @param task    - An async function to execute.
   * @returns A promise that resolves when the task completes.
   */
  enqueue(agentId: string, task: () => Promise<void>): Promise<void>;

  /**
   * Check whether an agent currently has a task executing.
   *
   * @param agentId - The agent to check.
   * @returns `true` if the agent's lane is currently busy.
   */
  isProcessing(agentId: string): boolean;

  /**
   * Return the number of tasks waiting in an agent's queue
   * (not counting the currently executing task).
   *
   * @param agentId - The agent to check.
   */
  getQueueLength(agentId: string): number;
}

// ---------------------------------------------------------------------------
// AgentRunResult — what the agent runner returns after processing
// ---------------------------------------------------------------------------

/**
 * The result of a single agent run (one LLM call cycle).
 */
export interface AgentRunResult {
  /** Text the agent wants to communicate (may be empty). */
  readonly text: string;

  /** Skills the agent executed and their results. */
  readonly skillResults: ReadonlyArray<{
    readonly skillName: string;
    readonly params: Record<string, unknown>;
    readonly result: SkillResult;
  }>;

  /** Duration of the entire run in milliseconds. */
  readonly durationMs: number;

  /** LLM token usage for this run. */
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };

  /** Whether the run completed successfully. */
  readonly success: boolean;

  /** Error message if the run failed. */
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// IAgentRunner — the core LLM loop for a single NPC
// ---------------------------------------------------------------------------

/**
 * The core agent execution loop for a single NPC.
 *
 * Lifecycle per run:
 *   1. Generate perception snapshot (game state → text)
 *   2. Build system prompt (identity + skills + perception + memory + rules)
 *   3. Call LLM with conversation history + tools
 *   4. If LLM returns tool calls → execute skills → feed results back → loop
 *   5. If LLM returns text → store in memory → return result
 *
 * One AgentRunner per NPC.  The runner holds references to the NPC's
 * skill registry, perception engine, memory, and LLM client.
 *
 * @see docs/openclaw-patterns.md — Pattern 2: Agent Runner
 * @see docs/openclaw-reference/src/agents/pi-embedded-runner/run.ts
 */
export interface IAgentRunner {
  /** The agent configuration this runner was created for. */
  readonly config: AgentConfig;

  /**
   * Process an incoming event through the full LLM loop.
   *
   * @param event - The normalized agent event to process.
   * @returns The result of the run (text, skill results, usage).
   */
  run(event: AgentEvent): Promise<AgentRunResult>;

  /**
   * Build the system prompt for this agent.
   * Combines: identity → world context → skills → memory → rules.
   *
   * Exposed for testing and debugging.
   *
   * @param perception - The current perception snapshot.
   * @returns The assembled system prompt string.
   */
  buildSystemPrompt(perception: PerceptionSnapshot): string;

  /**
   * Tear down the runner (clear timers, flush memory, etc.).
   */
  dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// AgentInstance — a running agent with all its subsystems
// ---------------------------------------------------------------------------

/**
 * A fully wired agent instance managed by the AgentManager.
 * Bundles the runner with its supporting subsystems.
 */
export interface AgentInstance {
  /** The agent's declarative configuration. */
  readonly config: AgentConfig;
  /** The core LLM loop. */
  readonly runner: IAgentRunner;
  /** The agent's memory. */
  readonly memory: IAgentMemory;
  /** The agent's skill set. */
  readonly skills: ISkillRegistry;
  /** The agent's perception engine. */
  readonly perception: IPerceptionEngine;
}

// ---------------------------------------------------------------------------
// IAgentManager — orchestrates multiple NPC agents
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of all AI NPC agents in the game.
 *
 * Responsibilities:
 *   - Create and wire up agent instances from config
 *   - Register/unregister agents as NPCs spawn/despawn
 *   - Provide access to individual agents by ID
 *   - Coordinate shutdown (dispose all agents)
 *
 * There is one AgentManager per game server.
 *
 * @see docs/openclaw-patterns.md — Architecture Summary
 */
export interface IAgentManager {
  /**
   * Create and register a new agent from a configuration.
   *
   * @param config - The agent's declarative configuration.
   * @returns The created agent instance.
   * @throws If an agent with the same ID is already registered.
   */
  registerAgent(config: AgentConfig): Promise<AgentInstance>;

  /**
   * Look up a running agent by ID.
   *
   * @param agentId - The agent identifier.
   * @returns The agent instance, or `undefined` if not found.
   */
  getAgent(agentId: string): AgentInstance | undefined;

  /**
   * Remove and dispose an agent.
   *
   * @param agentId - The agent to remove.
   * @returns `true` if the agent was found and removed.
   */
  removeAgent(agentId: string): Promise<boolean>;

  /**
   * Return all currently registered agents.
   */
  getAllAgents(): ReadonlyArray<AgentInstance>;

  /**
   * Gracefully shut down all agents (flush memory, clear timers).
   */
  dispose(): Promise<void>;
}

