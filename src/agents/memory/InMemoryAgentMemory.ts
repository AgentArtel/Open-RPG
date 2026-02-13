/**
 * InMemoryAgentMemory — minimal IAgentMemory implementation
 *
 * In-memory rolling buffer only. save/load are no-ops (stub for MVP).
 * Used by AgentRunner until persistence is implemented.
 */

import type { IAgentMemory, MemoryEntry } from './types'

const DEFAULT_MAX_MESSAGES = 50
const CHARS_PER_TOKEN = 4

export class InMemoryAgentMemory implements IAgentMemory {
  private messages: MemoryEntry[] = []
  private readonly maxMessages: number

  constructor(options?: { maxMessages?: number }) {
    this.maxMessages = options?.maxMessages ?? DEFAULT_MAX_MESSAGES
  }

  addMessage(entry: MemoryEntry): void {
    this.messages.push(entry)
    while (this.messages.length > this.maxMessages) {
      this.messages.shift()
    }
  }

  getRecentContext(maxTokens: number): MemoryEntry[] {
    let total = 0
    const result: MemoryEntry[] = []
    for (let i = 0; i < this.messages.length; i++) {
      const entry = this.messages[i]
      const tokens = Math.ceil(entry.content.length / CHARS_PER_TOKEN)
      if (total + tokens > maxTokens) break
      total += tokens
      result.push(entry)
    }
    return result
  }

  getAllMessages(): ReadonlyArray<MemoryEntry> {
    return this.messages
  }

  getMessageCount(): number {
    return this.messages.length
  }

  async save(_agentId: string): Promise<void> {
    // No-op stub
  }

  async load(_agentId: string): Promise<void> {
    // No-op stub
  }

  clear(): void {
    this.messages = []
  }
}
