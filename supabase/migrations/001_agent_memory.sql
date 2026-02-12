-- TASK-012: Agent Memory Persistence
-- Creates the agent_memory table for storing NPC conversation history.
-- Run this in the Supabase SQL Editor (or via supabase db push).

-- Enable pgvector extension (used later for embeddings; safe to enable now)
create extension if not exists vector;

-- Agent memory table: stores conversation messages per NPC agent
create table if not exists agent_memory (
  id         uuid          primary key default gen_random_uuid(),
  agent_id   text          not null,
  role       text          not null check (role in ('user', 'assistant', 'system', 'tool')),
  content    text          not null,
  metadata   jsonb         not null default '{}',
  importance smallint      not null default 5,
  created_at timestamptz   not null default now()
);

-- Primary query pattern: fetch recent messages for a specific agent
create index if not exists idx_agent_memory_agent_time
  on agent_memory (agent_id, created_at desc);

-- Comment for documentation
comment on table agent_memory is 'Stores per-agent conversation history for AI NPCs. Each row is one message (user, assistant, system, or tool).';
