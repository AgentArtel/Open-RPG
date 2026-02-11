/**
 * Memory System Types
 *
 * Defines how agents store and retrieve conversation history and facts.
 * MVP uses an in-memory conversation buffer with JSON file persistence.
 * Post-MVP can add vector search, compaction, and importance scoring.
 *
 * Pattern: OpenClaw Memory System (docs/openclaw-patterns.md, Pattern 5)
 * Reference: docs/openclaw-reference/src/agents/memory-search.ts
 *            docs/openclaw-reference/extensions/memory-core/index.ts
 */

// ---------------------------------------------------------------------------
// MemoryEntry — a single record in the conversation buffer
// ---------------------------------------------------------------------------

/**
 * The role of a message in the conversation history.
 *
 * - `user`      — something the player said or an event description
 * - `assistant` — the agent's (LLM's) response
 * - `system`    — injected context (perception snapshots, instructions)
 * - `tool`      — the result of a tool/skill execution
 */
export type MemoryRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * A single message in the agent's conversation history.
 *
 * Designed to map closely to the Anthropic Messages API format so that
 * building the `messages` array for an LLM call is straightforward.
 */
export interface MemoryEntry {
  /** Who produced this message. */
  readonly role: MemoryRole;

  /** The text content of the message. */
  readonly content: string;

  /** Unix-ms timestamp of when this entry was recorded. */
  readonly timestamp: number;

  /**
   * Optional metadata for filtering or display.
   *
   * Examples:
   *   - `{ playerId: "abc123" }` — which player was involved
   *   - `{ toolName: "say" }`    — which skill produced this result
   *   - `{ eventType: "idle" }`  — what triggered this entry
   */
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// MemoryConfig — tuning knobs for the memory system
// ---------------------------------------------------------------------------

/**
 * Configuration for an agent's memory subsystem.
 * Loaded from the agent's YAML config or set to defaults.
 */
export interface MemoryConfig {
  /**
   * Maximum number of messages to keep in the rolling buffer.
   * Oldest messages are dropped when this limit is exceeded.
   * @default 50
   */
  readonly maxMessages: number;

  /**
   * Approximate token budget for the context window slice that
   * memory occupies.  {@link IAgentMemory.getRecentContext} will
   * trim from the oldest end to stay within this budget.
   * @default 2000
   */
  readonly maxTokens: number;

  /**
   * Directory path where per-agent JSON files are stored.
   * Set to `undefined` to disable persistence (in-memory only).
   * @default "./data/memory"
   */
  readonly persistencePath?: string;

  /**
   * (Post-MVP) Enable vector search over memory entries.
   * @default false
   */
  readonly enableVectorSearch?: boolean;
}

// ---------------------------------------------------------------------------
// IAgentMemory — the memory interface each agent instance uses
// ---------------------------------------------------------------------------

/**
 * Per-agent memory: stores conversation history and supports
 * context retrieval for LLM prompt building.
 *
 * MVP implementation:
 *   - In-memory array of {@link MemoryEntry} records
 *   - Rolling window (oldest trimmed when `maxMessages` exceeded)
 *   - JSON file persistence per agent on save/load
 *
 * Post-MVP upgrades (from OpenClaw patterns):
 *   - Compaction: summarize oldest messages when context overflows
 *   - Hybrid vector + text search for memory retrieval
 *   - Importance scoring (Stanford Generative Agents pattern)
 *
 * @see docs/openclaw-patterns.md — Pattern 5: Memory System
 */
export interface IAgentMemory {
  /**
   * Append a new message to the conversation buffer.
   * If the buffer exceeds `maxMessages`, the oldest entry is dropped.
   *
   * @param entry - The memory entry to store.
   */
  addMessage(entry: MemoryEntry): void;

  /**
   * Retrieve the most recent messages that fit within a token budget.
   * Messages are returned in chronological order (oldest first).
   *
   * The implementation should use a simple token estimator (e.g. ~4
   * chars per token) to stay within budget.
   *
   * @param maxTokens - Approximate token budget for the returned messages.
   * @returns An array of memory entries, trimmed to fit the budget.
   */
  getRecentContext(maxTokens: number): MemoryEntry[];

  /**
   * Return all messages currently in the buffer (no trimming).
   * Useful for debugging or full-context operations.
   */
  getAllMessages(): ReadonlyArray<MemoryEntry>;

  /**
   * Return the number of messages currently in the buffer.
   */
  getMessageCount(): number;

  /**
   * Persist the current memory buffer to disk as a JSON file.
   * No-op if persistence is disabled in the config.
   *
   * @param agentId - The agent whose memory is being saved.
   */
  save(agentId: string): Promise<void>;

  /**
   * Load a previously persisted memory buffer from disk.
   * Replaces the current in-memory buffer.
   * No-op if the file does not exist or persistence is disabled.
   *
   * @param agentId - The agent whose memory should be loaded.
   */
  load(agentId: string): Promise<void>;

  /**
   * Clear the in-memory buffer (does NOT delete the persisted file).
   */
  clear(): void;
}

