# Supabase Persistence — Implementation Plan

## Overview

This plan covers adding Supabase as the persistence layer for the Open-RPG agent system.
It replaces the no-op `save()`/`load()` stubs in `InMemoryAgentMemory` with a real
Supabase-backed implementation, and adds player state persistence.

**Prerequisites:**
- A Supabase project created (free tier is fine for MVP)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars set in `.env`
- `@supabase/supabase-js` npm package installed

**Does NOT require:** TASK-008, TASK-010, or any other task to change. This is additive.

---

## Step-by-Step Implementation

### Step 1: Supabase Project Setup

**Manual (human) steps:**
1. Create a Supabase project at https://supabase.com
2. Enable the `vector` extension (for future pgvector use):
   ```sql
   create extension if not exists vector;
   ```
3. Get the project URL and service role key from Settings > API
4. Add to `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

### Step 2: Database Schema Migration

**File:** `supabase/migrations/001_agent_memory.sql` (new)

```sql
-- Enable pgvector extension (for future semantic search)
create extension if not exists vector;

-- Agent conversation memory
create table agent_memory (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  role          text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content       text not null,
  metadata      jsonb default '{}',
  importance    smallint default 5,
  created_at    timestamptz default now()
);

-- Index for fast retrieval by agent + time
create index idx_agent_memory_agent_time
  on agent_memory(agent_id, created_at desc);

-- Index for filtering by role
create index idx_agent_memory_agent_role
  on agent_memory(agent_id, role);
```

**File:** `supabase/migrations/002_player_state.sql` (new)

```sql
-- Player state persistence (replaces @rpgjs/save)
create table player_state (
  player_id     text primary key,
  name          text,
  map_id        text,
  position_x    integer,
  position_y    integer,
  direction     smallint default 0,
  state_data    jsonb default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Trigger to auto-update updated_at
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger player_state_updated
  before update on player_state
  for each row execute function update_timestamp();
```

### Step 3: Supabase Client Singleton

**File:** `src/config/supabase.ts` (new)

```typescript
import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Get the shared Supabase client. Returns null if env vars are missing
 * (allows graceful fallback to InMemoryAgentMemory).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Using in-memory fallback.')
    return null
  }

  client = createClient(url, key)
  return client
}
```

**Design decisions:**
- Singleton pattern — one client shared across all agents
- Service role key (not anon key) — server-side only, bypasses RLS
- Returns `null` if not configured — enables graceful fallback

### Step 4: SupabaseAgentMemory Implementation

**File:** `src/agents/memory/SupabaseAgentMemory.ts` (new)

This is the core deliverable. It implements `IAgentMemory` with Supabase as the backing store.

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IAgentMemory, MemoryEntry } from './types'

export class SupabaseAgentMemory implements IAgentMemory {
  /** In-memory buffer for low-latency reads during a session. */
  private buffer: MemoryEntry[] = []
  private readonly maxBufferSize: number
  private readonly agentId: string
  private readonly supabase: SupabaseClient
  private flushTimer: NodeJS.Timeout | null = null
  private pendingWrites: MemoryEntry[] = []

  constructor(agentId: string, supabase: SupabaseClient, options?: { maxBufferSize?: number }) {
    this.agentId = agentId
    this.supabase = supabase
    this.maxBufferSize = options?.maxBufferSize ?? 50

    // Flush pending writes every 5 seconds
    this.flushTimer = setInterval(() => this.flush(), 5000)
  }

  addMessage(entry: MemoryEntry): void {
    this.buffer.push(entry)
    this.pendingWrites.push(entry)

    // Trim local buffer
    while (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }
  }

  getRecentContext(maxTokens: number): MemoryEntry[] {
    // Read from local buffer first (fast path)
    let total = 0
    const result: MemoryEntry[] = []
    for (const entry of this.buffer) {
      const tokens = Math.ceil(entry.content.length / 4)
      if (total + tokens > maxTokens) break
      total += tokens
      result.push(entry)
    }
    return result
  }

  getAllMessages(): ReadonlyArray<MemoryEntry> {
    return this.buffer
  }

  getMessageCount(): number {
    return this.buffer.length
  }

  async save(agentId: string): Promise<void> {
    await this.flush()
  }

  async load(agentId: string): Promise<void> {
    // Load recent messages from Supabase into the buffer
    const { data, error } = await this.supabase
      .from('agent_memory')
      .select('role, content, metadata, created_at')
      .eq('agent_id', this.agentId)
      .order('created_at', { ascending: true })
      .limit(this.maxBufferSize)

    if (error) {
      console.error(`[SupabaseMemory:${this.agentId}] load failed:`, error.message)
      return
    }

    this.buffer = (data || []).map(row => ({
      role: row.role as MemoryEntry['role'],
      content: row.content,
      timestamp: new Date(row.created_at).getTime(),
      metadata: row.metadata ?? undefined,
    }))
  }

  clear(): void {
    this.buffer = []
    this.pendingWrites = []
  }

  /** Flush pending writes to Supabase in a single batch insert. */
  private async flush(): Promise<void> {
    if (this.pendingWrites.length === 0) return

    const rows = this.pendingWrites.map(entry => ({
      agent_id: this.agentId,
      role: entry.role,
      content: entry.content,
      metadata: entry.metadata ?? {},
      created_at: new Date(entry.timestamp).toISOString(),
    }))

    this.pendingWrites = []

    const { error } = await this.supabase
      .from('agent_memory')
      .insert(rows)

    if (error) {
      console.error(`[SupabaseMemory:${this.agentId}] flush failed:`, error.message)
      // Don't re-add to pendingWrites to avoid infinite retry loops
    }
  }

  /** Clean up: flush remaining writes and clear timer. */
  async dispose(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }
}
```

**Key design decisions:**
- **Write-behind buffer**: `addMessage()` is synchronous (fast), writes are batched to Supabase every 5 seconds
- **Read from local buffer**: `getRecentContext()` reads the in-memory buffer, not Supabase — same latency as the current implementation
- **`load()` hydrates buffer**: On startup, pulls recent messages from Supabase into the local buffer
- **`dispose()` flushes**: On shutdown, final flush ensures no data loss
- **No embedding generation yet**: The `embedding` column exists in the schema but is `null` for now (future task)

### Step 5: Memory Factory Function

**File:** `src/agents/memory/index.ts` (modify)

Add a factory that selects the right implementation:

```typescript
import { InMemoryAgentMemory } from './InMemoryAgentMemory'
import { SupabaseAgentMemory } from './SupabaseAgentMemory'
import { getSupabaseClient } from '../../config/supabase'
import type { IAgentMemory } from './types'

export function createAgentMemory(agentId: string): IAgentMemory {
  const supabase = getSupabaseClient()
  if (supabase) {
    return new SupabaseAgentMemory(agentId, supabase)
  }
  console.warn(`[Memory] Supabase unavailable — using in-memory for ${agentId}`)
  return new InMemoryAgentMemory()
}

export { InMemoryAgentMemory } from './InMemoryAgentMemory'
export { SupabaseAgentMemory } from './SupabaseAgentMemory'
export type { IAgentMemory, MemoryEntry, MemoryConfig } from './types'
```

### Step 6: Player State Persistence

**File:** `src/persistence/PlayerStateManager.ts` (new)

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PlayerState {
  playerId: string
  name: string
  mapId: string
  positionX: number
  positionY: number
  direction: number
  stateData: Record<string, unknown>
}

export class PlayerStateManager {
  constructor(private readonly supabase: SupabaseClient) {}

  async savePlayer(state: PlayerState): Promise<void> {
    const { error } = await this.supabase
      .from('player_state')
      .upsert({
        player_id: state.playerId,
        name: state.name,
        map_id: state.mapId,
        position_x: state.positionX,
        position_y: state.positionY,
        direction: state.direction,
        state_data: state.stateData,
      })

    if (error) {
      console.error(`[PlayerState] save failed for ${state.playerId}:`, error.message)
    }
  }

  async loadPlayer(playerId: string): Promise<PlayerState | null> {
    const { data, error } = await this.supabase
      .from('player_state')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (error || !data) return null

    return {
      playerId: data.player_id,
      name: data.name,
      mapId: data.map_id,
      positionX: data.position_x,
      positionY: data.position_y,
      direction: data.direction ?? 0,
      stateData: data.state_data ?? {},
    }
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.supabase
      .from('player_state')
      .delete()
      .eq('player_id', playerId)
  }
}
```

### Step 7: Wire Into RPGJS Player Hooks

**File:** `main/player.ts` (modify — minimal changes)

```typescript
// In onConnected or onJoinMap:
const state = await playerStateManager.loadPlayer(player.id)
if (state) {
  // Restore position, variables, etc.
  player.teleport({ x: state.positionX, y: state.positionY })
}

// In onDisconnected (new hook):
await playerStateManager.savePlayer({
  playerId: player.id,
  name: player.name,
  mapId: player.getCurrentMap()?.id ?? 'simplemap',
  positionX: player.position.x,
  positionY: player.position.y,
  direction: player.direction,
  stateData: {}, // expand as needed
})
```

### Step 8: Wire Into Agent Initialization

**File:** `main/events/agent-runner-test-npc.ts` (modify — minimal change)

Replace:
```typescript
const memory = new InMemoryAgentMemory()
```

With:
```typescript
import { createAgentMemory } from '../../src/agents/memory'
const memory = createAgentMemory(AGENT_ID)
// Load previous memories from Supabase
await memory.load(AGENT_ID)
```

---

## Implementation Order

```
TASK-012 (Supabase + Agent Memory)
    │   Install @supabase/supabase-js
    │   Create schema migration
    │   Build SupabaseAgentMemory
    │   Build Supabase client singleton
    │   Wire into agent initialization
    │   Test: memories persist across restart
    │
    └─► TASK-013 (Player State Persistence)
            Build PlayerStateManager
            Wire into player.ts hooks
            Test: player reconnects with saved state
```

---

## What Changes vs. What Doesn't

| Component | Changes? | Details |
|-----------|----------|---------|
| `IAgentMemory` interface | NO | SupabaseAgentMemory implements it as-is |
| `InMemoryAgentMemory` | KEPT | Fallback when Supabase unavailable |
| `SupabaseAgentMemory` | NEW | Core deliverable |
| `src/config/supabase.ts` | NEW | Client singleton |
| `supabase/migrations/` | NEW | SQL schema files |
| `AgentRunner` | NO | Already uses IAgentMemory |
| Skills | NO | No changes |
| Bridge | NO | No changes |
| `main/player.ts` | MINIMAL | Save/load hooks (TASK-013 only) |
| `agent-runner-test-npc.ts` | MINIMAL | Swap memory constructor |
| `package.json` | ADD | `@supabase/supabase-js` dependency |
| `.env` | ADD | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## Testing Strategy

1. **Unit test SupabaseAgentMemory** — Mock Supabase client, verify insert/select queries
2. **Unit test PlayerStateManager** — Mock Supabase client, verify upsert/select
3. **Integration test** — Real Supabase project, write + read + verify persistence
4. **Restart test** — Start server, talk to NPC, restart server, verify NPC remembers
5. **Fallback test** — Unset env vars, verify InMemoryAgentMemory is used without crash

---

## Estimated Scope

- **TASK-012:** ~200 lines new code + ~50 lines SQL + config changes
- **TASK-013:** ~120 lines new code + ~30 lines SQL + player.ts modifications
- **Total:** ~400 lines, minimal changes to existing working code
