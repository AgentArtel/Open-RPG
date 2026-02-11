/**
 * Skill System Types
 *
 * Defines how agents interact with the game world through structured
 * commands.  Each "skill" is a game action the LLM can invoke via
 * Anthropic's function-calling / tool-use API.
 *
 * MVP skills: move, say, look, emote, wait
 *
 * Pattern: OpenClaw Tool System (docs/openclaw-patterns.md, Pattern 3)
 * Reference: docs/openclaw-reference/src/agents/pi-tools.ts
 *            docs/openclaw-reference/src/agents/tools/common.ts
 */

import type { GameEvent, GamePlayer, Position, MapInfo } from '../bridge/types';

// ---------------------------------------------------------------------------
// SkillResult — what every skill execution returns
// ---------------------------------------------------------------------------

/**
 * Standardized result returned by every skill's `execute` method.
 * The agent runner feeds this back to the LLM so it knows what happened.
 */
export interface SkillResult {
  /** Whether the action completed successfully. */
  readonly success: boolean;

  /**
   * Human-readable description of what happened.
   * The LLM sees this as the tool result content.
   *
   * @example "Moved 3 tiles east"
   * @example "Said: \"Greetings, traveler!\""
   * @example "Error: no player nearby to talk to"
   */
  readonly message: string;

  /**
   * If the skill failed, a machine-readable error code.
   * Helps the agent runner decide whether to retry or fall back.
   *
   * @example "no_target"
   * @example "out_of_bounds"
   * @example "cooldown"
   */
  readonly error?: string;

  /**
   * Optional structured data the skill wants to surface.
   * Not sent to the LLM — used internally for logging or metrics.
   */
  readonly data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GameContext — runtime context passed into every skill execution
// ---------------------------------------------------------------------------

/**
 * Runtime context injected into every skill's `execute` call.
 * Provides access to the RPGJS game world through the NPC's event instance.
 *
 * Skills use this to call RPGJS APIs (e.g. `event.showText(...)`,
 * `event.moveRoute(...)`).  The bridge layer constructs a fresh
 * GameContext before each skill execution.
 */
export interface GameContext {
  /** The RPGJS event (NPC) that is executing the skill. */
  readonly event: GameEvent;

  /** The unique agent identifier (matches AgentConfig.id). */
  readonly agentId: string;

  /** Current tile-based position of the NPC. */
  readonly position: Position;

  /** Info about the map the NPC is currently on. */
  readonly map: MapInfo;

  /**
   * Players currently within the NPC's perception radius.
   * Empty array if no players are nearby.
   */
  readonly nearbyPlayers: ReadonlyArray<NearbyPlayerInfo>;
}

/**
 * Lightweight info about a player near the NPC.
 * Used by skills like `say` to find a conversation target.
 */
export interface NearbyPlayerInfo {
  /** The live RPGJS player reference (needed for showText, etc.). */
  readonly player: GamePlayer;
  /** Display name. */
  readonly name: string;
  /** Approximate distance in tiles from the NPC. */
  readonly distance: number;
}

// ---------------------------------------------------------------------------
// Skill Parameter Schema
// ---------------------------------------------------------------------------

/**
 * Describes a single parameter in a skill's input schema.
 * Mirrors the JSON Schema subset that Anthropic's tool-use API accepts.
 */
export interface SkillParameterSchema {
  /** JSON Schema type. */
  readonly type: 'string' | 'number' | 'boolean' | 'integer';
  /** Human-readable description shown to the LLM. */
  readonly description?: string;
  /** Allowed values (for enum-style parameters). */
  readonly enum?: ReadonlyArray<string | number>;
  /** Whether this parameter is required. @default true */
  readonly required?: boolean;
  /** Default value if the LLM omits the parameter. */
  readonly default?: string | number | boolean;
}

// ---------------------------------------------------------------------------
// IAgentSkill — a single game command the LLM can invoke
// ---------------------------------------------------------------------------

/**
 * A game command that an NPC agent can execute.
 *
 * Each skill maps to one RPGJS game action and is exposed to the LLM
 * as a tool via Anthropic's function-calling API.
 *
 * Skill lifecycle:
 *   1. LLM selects the tool and provides parameters
 *   2. Agent runner validates parameters against the schema
 *   3. Agent runner calls `execute(params, context)`
 *   4. Skill calls RPGJS APIs and returns a {@link SkillResult}
 *   5. Agent runner feeds the result back to the LLM
 *
 * @example
 * ```ts
 * const saySkill: IAgentSkill = {
 *   name: 'say',
 *   description: 'Say something to a nearby player',
 *   parameters: {
 *     text:   { type: 'string', description: 'What to say' },
 *     target: { type: 'string', description: 'Player name', required: false },
 *   },
 *   execute: async (params, context) => {
 *     const player = context.nearbyPlayers[0]?.player;
 *     if (!player) return { success: false, message: 'No player nearby', error: 'no_target' };
 *     await player.showText(String(params.text), { talkWith: context.event });
 *     return { success: true, message: `Said: "${params.text}"` };
 *   },
 * };
 * ```
 *
 * @see docs/openclaw-patterns.md — Pattern 3: Skill/Tool System
 */
export interface IAgentSkill {
  /** Unique skill name (used as the tool name in LLM calls). */
  readonly name: string;

  /**
   * Human-readable description shown to the LLM so it knows
   * when and how to use this skill.
   */
  readonly description: string;

  /**
   * Input parameter definitions keyed by parameter name.
   * Used to build the JSON Schema for Anthropic's `tools` array.
   */
  readonly parameters: Record<string, SkillParameterSchema>;

  /**
   * Execute the skill with the given parameters and game context.
   *
   * Implementations MUST catch their own errors and return a
   * {@link SkillResult} with `success: false` — never throw.
   *
   * @param params  - The parameter values provided by the LLM.
   * @param context - Runtime game context (NPC event, nearby players, etc.).
   * @returns A result describing what happened.
   */
  execute(
    params: Record<string, unknown>,
    context: GameContext,
  ): Promise<SkillResult>;
}

// ---------------------------------------------------------------------------
// ISkillRegistry — manages available skills for an agent
// ---------------------------------------------------------------------------

/**
 * Manages the set of skills available to an agent and converts them
 * to the format expected by the LLM's tool-use API.
 *
 * The registry is typically populated at agent startup based on the
 * agent's YAML config (`skills: [say, move, look, emote, wait]`).
 */
export interface ISkillRegistry {
  /**
   * Register a skill so it becomes available to the agent.
   *
   * @param skill - The skill to register.
   * @throws If a skill with the same name is already registered.
   */
  register(skill: IAgentSkill): void;

  /**
   * Retrieve a skill by name.
   *
   * @param name - The skill name.
   * @returns The skill, or `undefined` if not found.
   */
  get(name: string): IAgentSkill | undefined;

  /**
   * Return all registered skills.
   */
  getAll(): ReadonlyArray<IAgentSkill>;

  /**
   * Convert all registered skills into OpenAI-compatible tool definitions
   * format for inclusion in an LLM API call.
   *
   * @returns An array of tool definition objects ready for the
   *          `tools` parameter of the OpenAI Chat Completions API
   *          (used by Kimi K2/K2.5).
   */
  getToolDefinitions(): ReadonlyArray<OpenAIToolDefinition>;

  /**
   * Execute a skill by name with the given parameters and context.
   *
   * @param name - The skill name.
   * @param params - The parameter values provided by the LLM.
   * @param context - Runtime game context.
   * @returns The skill execution result.
   */
  executeSkill(
    name: string,
    params: Record<string, unknown>,
    context: GameContext
  ): Promise<SkillResult>;
}

// ---------------------------------------------------------------------------
// ToolDefinition — Anthropic-compatible tool format (LEGACY)
// ---------------------------------------------------------------------------

/**
 * A tool definition in the format expected by the Anthropic Messages API.
 * Generated by {@link ISkillRegistry.getToolDefinitions}.
 *
 * @deprecated Use {@link OpenAIToolDefinition} instead. This format is kept
 *             for reference but is not used with Kimi K2/K2.5 (OpenAI-compatible API).
 *
 * @see https://docs.anthropic.com/en/docs/tool-use
 */
export interface ToolDefinition {
  /** Tool name (matches IAgentSkill.name). */
  readonly name: string;
  /** Tool description shown to the LLM. */
  readonly description: string;
  /** JSON Schema describing the tool's input parameters. */
  readonly input_schema: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
  };
}

// ---------------------------------------------------------------------------
// OpenAIToolDefinition — OpenAI-compatible tool format (for Kimi K2/K2.5)
// ---------------------------------------------------------------------------

/**
 * A tool definition in the format expected by the OpenAI Chat Completions API.
 * This is the format used by Kimi K2/K2.5 (which uses OpenAI-compatible API).
 * Generated by {@link ISkillRegistry.getToolDefinitions}.
 *
 * @see https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools
 */
export interface OpenAIToolDefinition {
  /** Always 'function' for function calling. */
  readonly type: 'function';
  /** Function definition containing name, description, and parameters. */
  readonly function: {
    /** Tool name (matches IAgentSkill.name). */
    readonly name: string;
    /** Tool description shown to the LLM. */
    readonly description: string;
    /** JSON Schema describing the tool's input parameters. */
    readonly parameters: {
      readonly type: 'object';
      readonly properties: Record<string, unknown>;
      readonly required?: ReadonlyArray<string>;
    };
  };
}

