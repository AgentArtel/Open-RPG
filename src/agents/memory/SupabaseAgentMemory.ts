/**
 * SupabaseAgentMemory — persistent IAgentMemory backed by Supabase (Postgres)
 *
 * Implements the same IAgentMemory interface as InMemoryAgentMemory, but
 * persists conversation history to the `agent_memory` table in Supabase.
 *
 * Design:
 *   - addMessage() is synchronous — writes to an in-memory buffer AND a
 *     pendingWrites queue. getRecentContext() reads from the buffer only.
 *   - A write-behind flush runs every 5 seconds, batch-inserting pending
 *     rows into Supabase. This keeps addMessage() non-blocking.
 *   - load() hydrates the buffer from Supabase on startup.
 *   - save() triggers an immediate flush.
 *   - dispose() flushes remaining writes and clears the timer.
 *
 * Error handling: All Supabase calls are wrapped in try/catch. Failures
 * are logged but never thrown — the agent keeps running with whatever
 * data is in the local buffer.
 *
 * @see src/agents/memory/types.ts — IAgentMemory interface
 * @see supabase/migrations/001_agent_memory.sql — table schema
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IAgentMemory, MemoryEntry, MemoryRole } from './types'

/** Accept any schema variant of SupabaseClient (game, public, etc.) */
type AnySupabaseClient = SupabaseClient<any, string>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[SupabaseMemory]'
const DEFAULT_MAX_BUFFER = 50
const DEFAULT_FLUSH_INTERVAL_MS = 5_000
const CHARS_PER_TOKEN = 4 // same estimator as InMemoryAgentMemory
const TABLE_NAME = 'agent_memory'

// ---------------------------------------------------------------------------
// Database row shape (matches 001_agent_memory.sql)
// ---------------------------------------------------------------------------

/** Shape of a row returned by a Supabase SELECT on agent_memory. */
interface AgentMemoryRow {
  id: string
  agent_id: string
  role: MemoryRole
  content: string
  metadata: Record<string, unknown>
  importance: number
  created_at: string // ISO timestamp from Postgres
}

// ---------------------------------------------------------------------------
// SupabaseAgentMemory
// ---------------------------------------------------------------------------

export interface SupabaseAgentMemoryOptions {
  /** Maximum messages to keep in the local buffer. @default 50 */
  maxBufferSize?: number
  /** How often to flush pending writes to Supabase (ms). @default 5000 */
  flushIntervalMs?: number
}

export class SupabaseAgentMemory implements IAgentMemory {
  private readonly agentId: string
  private readonly supabase: AnySupabaseClient
  private readonly maxBufferSize: number

  /** Rolling conversation buffer (source of truth for reads). */
  private buffer: MemoryEntry[] = []

  /** Queue of entries not yet flushed to Supabase. */
  private pendingWrites: MemoryEntry[] = []

  /** Periodic flush timer handle. */
  private flushTimer: ReturnType<typeof setInterval> | null = null

  /** Track whether we've been disposed to avoid post-dispose writes. */
  private disposed = false

  constructor(
    agentId: string,
    supabase: AnySupabaseClient,
    options?: SupabaseAgentMemoryOptions
  ) {
    this.agentId = agentId
    this.supabase = supabase
    this.maxBufferSize = options?.maxBufferSize ?? DEFAULT_MAX_BUFFER

    // Start the write-behind flush timer
    const interval = options?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
    this.flushTimer = setInterval(() => {
      void this.flush()
    }, interval)

    console.log(
      `${LOG_PREFIX}:${agentId} initialized (buffer=${this.maxBufferSize}, flush=${interval}ms)`
    )
  }

  // -------------------------------------------------------------------------
  // IAgentMemory — synchronous operations
  // -------------------------------------------------------------------------

  /**
   * Append a message to the local buffer and queue it for persistence.
   * This is synchronous — the actual DB write happens in the background.
   */
  addMessage(entry: MemoryEntry): void {
    // Add to local buffer
    this.buffer.push(entry)

    // Trim buffer to max size (drop oldest)
    while (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    // Queue for write-behind flush
    this.pendingWrites.push(entry)
  }

  /**
   * Retrieve recent messages that fit within a token budget.
   * Reads only from the local buffer (no DB call).
   */
  getRecentContext(maxTokens: number): MemoryEntry[] {
    let total = 0
    const result: MemoryEntry[] = []

    // Walk from oldest to newest, accumulating until budget exhausted
    for (let i = 0; i < this.buffer.length; i++) {
      const entry = this.buffer[i]
      const tokens = Math.ceil(entry.content.length / CHARS_PER_TOKEN)
      if (total + tokens > maxTokens) break
      total += tokens
      result.push(entry)
    }

    return result
  }

  /** Return all messages currently in the buffer. */
  getAllMessages(): ReadonlyArray<MemoryEntry> {
    return this.buffer
  }

  /** Return the count of messages in the buffer. */
  getMessageCount(): number {
    return this.buffer.length
  }

  /** Clear the local buffer and pending writes (does NOT delete DB rows). */
  clear(): void {
    this.buffer = []
    this.pendingWrites = []
  }

  // -------------------------------------------------------------------------
  // IAgentMemory — async persistence
  // -------------------------------------------------------------------------

  /**
   * Persist all pending writes to Supabase immediately.
   * Called by the agent system when shutting down or saving state.
   */
  async save(_agentId: string): Promise<void> {
    await this.flush()
  }

  /**
   * Hydrate the local buffer from Supabase.
   * Fetches the most recent messages for this agent (up to maxBufferSize)
   * and replaces the local buffer contents.
   */
  async load(_agentId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from(TABLE_NAME)
        .select('role, content, metadata, created_at')
        .eq('agent_id', this.agentId)
        .order('created_at', { ascending: true })
        .limit(this.maxBufferSize)

      if (error) {
        console.error(
          `${LOG_PREFIX}:${this.agentId} load failed:`,
          error.message
        )
        return
      }

      if (!data || data.length === 0) {
        console.log(
          `${LOG_PREFIX}:${this.agentId} no prior memories found in DB`
        )
        return
      }

      // Map DB rows to MemoryEntry objects
      this.buffer = (data as Pick<AgentMemoryRow, 'role' | 'content' | 'metadata' | 'created_at'>[]).map(
        (row) => ({
          role: row.role,
          content: row.content,
          timestamp: new Date(row.created_at).getTime(),
          metadata: row.metadata && Object.keys(row.metadata).length > 0
            ? row.metadata
            : undefined,
        })
      )

      console.log(
        `${LOG_PREFIX}:${this.agentId} loaded ${this.buffer.length} memories from DB`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX}:${this.agentId} load exception:`, msg)
      // Leave buffer empty — agent will start fresh
    }
  }

  // -------------------------------------------------------------------------
  // Write-behind flush
  // -------------------------------------------------------------------------

  /**
   * Flush all pending writes to Supabase.
   * Called periodically by the timer and on save()/dispose().
   */
  private async flush(): Promise<void> {
    if (this.pendingWrites.length === 0) return

    // Snapshot and clear the queue before the async insert so that new
    // entries added during the insert go into a fresh queue.
    const toWrite = this.pendingWrites.splice(0)

    const rows = toWrite.map((entry) => ({
      agent_id: this.agentId,
      role: entry.role,
      content: entry.content,
      metadata: entry.metadata ?? {},
      created_at: new Date(entry.timestamp).toISOString(),
    }))

    try {
      const { error } = await this.supabase.from(TABLE_NAME).insert(rows)

      if (error) {
        console.error(
          `${LOG_PREFIX}:${this.agentId} flush failed (${rows.length} rows):`,
          error.message
        )
        // Do NOT re-queue — avoid infinite retry loops.
        // Data is still in the local buffer for the current session.
        return
      }

      console.log(
        `${LOG_PREFIX}:${this.agentId} flushed ${rows.length} rows to DB`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `${LOG_PREFIX}:${this.agentId} flush exception (${rows.length} rows):`,
        msg
      )
      // Same policy: don't re-queue, don't throw.
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Dispose: clear the flush timer and do a final flush.
   * Call this from the NPC's onDestroy to avoid leaking timers.
   *
   * Note: This is NOT on the IAgentMemory interface. Callers that know
   * they have a SupabaseAgentMemory (or use the factory) should call
   * dispose() explicitly on cleanup.
   */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true

    // Stop the periodic flush
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Final flush of any remaining writes
    await this.flush()

    console.log(`${LOG_PREFIX}:${this.agentId} disposed`)
  }
}
