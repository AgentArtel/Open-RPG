## TASK-012: Supabase Agent Memory Persistence

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 3 (Memory Persistence)
- **Type**: Create + Modify
- **Depends on**: TASK-008 (AgentRunner must exist — DONE)
- **Blocks**: TASK-013 (Player State Persistence)

### Context

Agent memory is currently in-memory only (`InMemoryAgentMemory`). The `save()` and
`load()` methods are no-op stubs. Every server restart wipes all NPC memories.
NPCs can't remember players across sessions, which breaks the core experience of
AI agents that learn and grow.

This task adds Supabase (hosted Postgres) as the persistence layer for agent memory.
The existing `IAgentMemory` interface already supports everything we need — we just
need a new implementation class that writes to Supabase instead of holding a JS array.

### Objective

A working `SupabaseAgentMemory` that persists NPC conversations to Supabase,
survives server restarts, and gracefully falls back to in-memory when Supabase
is unavailable.

### Prerequisites (Human)

Before Cursor starts this task, the human must:
1. Create a Supabase project at https://supabase.com
2. Enable the `vector` extension in SQL Editor: `create extension if not exists vector;`
3. Add to `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

### Specifications

**Install dependency:**
```bash
npm install @supabase/supabase-js
```

**Create files:**
- `supabase/migrations/001_agent_memory.sql` — Agent memory table + indexes
- `src/config/supabase.ts` — Supabase client singleton
- `src/agents/memory/SupabaseAgentMemory.ts` — Core implementation

**Modify files:**
- `src/agents/memory/index.ts` — Add `createAgentMemory()` factory
- `main/events/agent-runner-test-npc.ts` — Use `createAgentMemory()` + call `load()`
- `package.json` — Add `@supabase/supabase-js`
- `.env.example` — Add Supabase env var placeholders

**Database Schema (`001_agent_memory.sql`):**

```sql
create extension if not exists vector;

create table agent_memory (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  role          text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content       text not null,
  metadata      jsonb default '{}',
  importance    smallint default 5,
  created_at    timestamptz default now()
);

create index idx_agent_memory_agent_time
  on agent_memory(agent_id, created_at desc);
```

Note: The `embedding vector(1536)` column and its index are intentionally omitted
from this migration. They will be added in a future task when semantic search is
implemented. Keep the schema minimal for MVP.

**Supabase Client Singleton (`src/config/supabase.ts`, ~25 lines):**
- Import `createClient` from `@supabase/supabase-js`
- Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `process.env`
- Return `null` if either is missing (enables graceful fallback)
- Cache the client in a module-level variable (singleton)
- Use service role key (server-side only, bypasses RLS)
- Import `dotenv/config` at the top (same pattern as `LLMClient.ts`)

**SupabaseAgentMemory (`src/agents/memory/SupabaseAgentMemory.ts`, ~130 lines):**

Implements `IAgentMemory` with these behaviors:

- **Constructor**: Takes `agentId` and `SupabaseClient`. Sets up in-memory buffer
  and a write-behind flush timer (every 5 seconds).
- **`addMessage(entry)`**: Appends to local buffer AND to a pending-writes queue.
  Trims buffer when it exceeds `maxBufferSize` (default 50). Synchronous — no await.
- **`getRecentContext(maxTokens)`**: Reads from the local buffer (fast path, same
  as `InMemoryAgentMemory`). Does NOT query Supabase on every call.
- **`getAllMessages()`**: Returns the local buffer.
- **`getMessageCount()`**: Returns `buffer.length`.
- **`save(agentId)`**: Calls `flush()` — writes all pending entries to Supabase.
- **`load(agentId)`**: Queries Supabase for recent messages (`order by created_at desc,
  limit maxBufferSize`) and hydrates the local buffer. Called once at agent startup.
- **`clear()`**: Empties local buffer and pending-writes queue. Does NOT delete from Supabase.
- **`flush()`** (private): Batch-inserts all `pendingWrites` into `agent_memory` table.
  Clears the queue. Logs errors but does not throw (never crash the game server).
- **`dispose()`** (new, not on interface): Clears the flush timer and does a final flush.
  Called from `AgentRunner.dispose()` or NPC's `onDestroy`.

**Error handling:**
- All Supabase calls wrapped in try/catch
- Errors logged to console, never thrown
- If flush fails, pending writes are dropped (not re-queued) to prevent infinite retry
- If load fails, buffer stays empty (agent starts fresh)

**Memory Factory (`src/agents/memory/index.ts`):**

```typescript
export function createAgentMemory(agentId: string): IAgentMemory {
  const supabase = getSupabaseClient()
  if (supabase) {
    return new SupabaseAgentMemory(agentId, supabase)
  }
  console.warn(`[Memory] Supabase unavailable — using in-memory for ${agentId}`)
  return new InMemoryAgentMemory()
}
```

**Agent NPC Changes (`agent-runner-test-npc.ts`):**

Replace `new InMemoryAgentMemory()` with:
```typescript
import { createAgentMemory } from '../../src/agents/memory'
const memory = createAgentMemory(AGENT_ID)
await memory.load(AGENT_ID)
```

### Acceptance Criteria

- [ ] `@supabase/supabase-js` installed
- [ ] SQL migration file creates `agent_memory` table with correct schema
- [ ] `SupabaseAgentMemory` implements `IAgentMemory` interface
- [ ] `addMessage()` is synchronous (writes buffered, not blocking)
- [ ] `getRecentContext()` reads from local buffer (same latency as before)
- [ ] `load()` hydrates buffer from Supabase on startup
- [ ] `save()` flushes pending writes to Supabase
- [ ] Write-behind flush runs every 5 seconds
- [ ] `dispose()` does final flush and clears timer
- [ ] Graceful fallback: if `SUPABASE_URL` is unset, uses `InMemoryAgentMemory`
- [ ] NPC memories persist across server restart (manual test)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Add pgvector embedding column or semantic search (future task)
- Add importance scoring (future task)
- Change the `IAgentMemory` interface
- Delete `InMemoryAgentMemory` (it's the fallback and used for tests)
- Use Supabase anon key (use service role key — server-side only)
- Add Supabase Realtime subscriptions (not needed for MVP)
- Implement player state persistence (that's TASK-013)

### Reference

- Feature idea: `.ai/idea/06-supabase-persistence.md`
- Implementation plan: `.ai/idea/06a-supabase-implementation-plan.md`
- Memory interface: `src/agents/memory/types.ts` (IAgentMemory, MemoryEntry)
- Current implementation: `src/agents/memory/InMemoryAgentMemory.ts`
- Agent runner (consumer): `src/agents/core/AgentRunner.ts`
- Test NPC (integration point): `main/events/agent-runner-test-npc.ts`
- Supabase JS docs: https://supabase.com/docs/reference/javascript/introduction

### Handoff Notes

_(To be filled by implementer)_
