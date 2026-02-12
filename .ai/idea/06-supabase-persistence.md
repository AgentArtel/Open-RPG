# Supabase as Persistence Layer

## The Idea in One Sentence

Replace all in-memory and file-based persistence with Supabase (hosted Postgres + pgvector), giving every NPC agent persistent memory that survives restarts, semantic memory search for human-like recall, and player state that persists across sessions — all through a single connection string.

---

## The Problem This Solves

Right now, the entire agent system is **amnesiac**. Every server restart wipes every NPC's memory clean. The `InMemoryAgentMemory` holds up to 50 messages in a JavaScript array, and `save()`/`load()` are literally no-ops. This means:

1. **NPCs forget everything** — A player has a deep conversation with Elder Theron, logs off, comes back tomorrow, and the NPC has no idea who they are.
2. **No semantic recall** — Even within a session, NPCs can only retrieve the last N messages. They can't answer "what did that player tell me last week?" because there's no search beyond the rolling buffer.
3. **No player persistence** — Player progress, inventory, and position aren't saved. Close the browser and everything resets.
4. **No analytics** — We can't track which NPCs players talk to most, what topics come up, or how the agent system is performing over time.

The original plan was JSON file persistence (Phase 3 backlog) and `@rpgjs/save` plugin (Phase 5). But JSON files don't scale, don't support search, and `@rpgjs/save` is a client-side localStorage plugin — useless for a server-authoritative game.

---

## Why Supabase

Supabase gives us hosted Postgres with batteries included:

| Need | Supabase Feature | Alternative We'd Have to Build |
|------|-----------------|-------------------------------|
| Agent memory persistence | Postgres tables | JSON file read/write + file locking |
| Semantic memory search | pgvector extension | Separate vector DB (Pinecone, Qdrant) |
| Player state persistence | Row per player | @rpgjs/save (localStorage, client-only) |
| Real-time subscriptions | Supabase Realtime | Custom WebSocket layer |
| Auth (future) | Built-in auth | Passport.js + session management |
| Admin dashboard (future) | Supabase Studio | Custom admin UI |
| Backups | Automatic | Manual pg_dump scripts |

**Deployment compatibility:** Supabase projects are hosted — the Railway game server just needs a `SUPABASE_URL` and `SUPABASE_ANON_KEY` env var. No database to provision on Railway.

**SDK:** `@supabase/supabase-js` is a lightweight client. Works in Node.js server-side. No ORM needed for our use case.

---

## The Core Architecture

### Database Schema

Three tables cover all our persistence needs:

```sql
-- Agent conversation memory
create table agent_memory (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  role          text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content       text not null,
  metadata      jsonb default '{}',
  embedding     vector(1536),          -- pgvector for semantic search
  importance    smallint default 5,     -- 1-10 Stanford-style importance score
  created_at    timestamptz default now()
);

create index idx_agent_memory_agent on agent_memory(agent_id, created_at desc);
create index idx_agent_memory_embedding on agent_memory using ivfflat (embedding vector_cosine_ops);

-- Player state persistence
create table player_state (
  player_id     text primary key,
  name          text,
  map_id        text,
  position_x    integer,
  position_y    integer,
  state_data    jsonb default '{}',     -- inventory, variables, quest progress
  updated_at    timestamptz default now()
);

-- Agent config (optional — can stay in YAML initially)
create table agent_config (
  agent_id      text primary key,
  config        jsonb not null,          -- Full AgentConfig as JSON
  updated_at    timestamptz default now()
);
```

### How It Fits Into Existing Architecture

```
AgentRunner.run(event)
    │
    ├── perception.generateSnapshot()     ← no change
    ├── memory.getRecentContext()          ← reads from Supabase
    ├── llmClient.complete()              ← no change
    ├── skills.executeSkill()             ← no change
    └── memory.addMessage()               ← writes to Supabase
              │
              ▼
    SupabaseAgentMemory implements IAgentMemory
              │
              ▼
    @supabase/supabase-js → Supabase Postgres
```

**Key insight:** The `IAgentMemory` interface already has `save()`, `load()`, `addMessage()`, `getRecentContext()`. We just need a new implementation class (`SupabaseAgentMemory`) that talks to Supabase instead of holding an array. The `AgentRunner` doesn't change at all.

### Memory Retrieval (Stanford Pattern)

With Supabase + pgvector, we can implement the Stanford Generative Agents memory retrieval formula we planned to adopt:

```
score = α × recency + β × importance + γ × relevance
```

- **Recency**: `1 / (hours_since_created + 1)` — computed from `created_at`
- **Importance**: Stored in the `importance` column (1-10, scored by LLM)
- **Relevance**: Cosine similarity between query embedding and `embedding` column

This is a single SQL query with pgvector:

```sql
select *,
  (1.0 / (extract(epoch from now() - created_at) / 3600 + 1)) as recency,
  1 - (embedding <=> $query_embedding) as relevance
from agent_memory
where agent_id = $agent_id
order by
  0.3 * (1.0 / (extract(epoch from now() - created_at) / 3600 + 1))
  + 0.2 * (importance / 10.0)
  + 0.5 * (1 - (embedding <=> $query_embedding))
desc
limit 20;
```

---

## What Changes vs. What Doesn't

| Component | Changes? | Details |
|-----------|----------|---------|
| `IAgentMemory` interface | MINIMAL | Add optional `search(query)` method |
| `InMemoryAgentMemory` | KEPT | Still used for tests and offline dev |
| `SupabaseAgentMemory` | NEW | Implements `IAgentMemory` backed by Supabase |
| `AgentRunner` | NO | Already uses `IAgentMemory` interface |
| Skills | NO | No changes |
| Perception | NO | No changes |
| Bridge | NO | No changes |
| `player.ts` | MINIMAL | Add save/load hooks for player state |

---

## Concerns and Mitigations

**Latency on every memory write.** Each `addMessage()` becomes a network call to Supabase. Mitigation: Write-behind buffer — batch inserts every few seconds instead of one-at-a-time. `getRecentContext()` reads from the in-memory buffer first, falls back to Supabase for older entries.

**Embedding generation cost.** Computing embeddings for every message adds LLM calls. Mitigation: Only embed messages above a certain length/importance threshold. Use Supabase's built-in embedding function or a cheap embedding model. Skip embeddings for MVP and add in a follow-up task.

**Supabase free tier limits.** Free plan has 500MB storage and 2GB transfer. Mitigation: More than enough for MVP. 50 NPCs × 1000 messages × 500 bytes = ~25MB. Upgrade to Pro ($25/mo) when needed.

**Single point of failure.** If Supabase is down, memory writes fail. Mitigation: `SupabaseAgentMemory` falls back to in-memory buffer when Supabase is unreachable. Flush buffer when connection recovers.

---

## What Success Looks Like

### MVP (TASK-012)
- `SupabaseAgentMemory` implements `IAgentMemory`
- NPC conversations persist across server restarts
- `getRecentContext()` pulls from Supabase
- In-memory write buffer for low-latency writes
- Fallback to `InMemoryAgentMemory` when Supabase is unavailable

### Phase 2 (TASK-013)
- Player position and state saved to Supabase on disconnect
- Player state restored on reconnect
- Works alongside RPGJS's native state system

### Future (Post-MVP)
- pgvector semantic search for memory retrieval
- Importance scoring via LLM
- Stanford-formula memory retrieval
- Reflection/compaction (summarize old memories)
- Admin dashboard via Supabase Studio

---

## Open Questions

1. **Embeddings model:** Which model for embedding generation? Kimi K2 supports embeddings, or use a dedicated embedding model (cheaper, faster)?
2. **Write buffer flush frequency:** Every 5 seconds? On every `save()` call? On server shutdown?
3. **Player state granularity:** Save full RPGJS player state as JSON blob, or normalize into columns?
4. **Agent config in DB vs YAML:** Keep YAML configs as source of truth and only use DB for memory, or migrate configs to DB for runtime hot-reloading?
