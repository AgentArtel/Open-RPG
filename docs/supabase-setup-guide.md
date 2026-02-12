# Supabase Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login works)
2. Click **New Project**
3. Pick a name (e.g., `open-rpg`) and set a database password
4. Select a region close to your Railway deployment (e.g., US East)
5. Click **Create new project** — wait ~2 minutes for it to provision

### Step 2: Get Your Keys

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy these two values:
   - **Project URL** — looks like `https://xxxxx.supabase.co`
   - **service_role key** (under "Project API keys") — starts with `eyJhbGci...`

> **Important:** Use the `service_role` key, NOT the `anon` key. The service role
> key bypasses Row Level Security, which is what we need for server-side access.
> Never expose this key in client-side code.

### Step 3: Add to .env

Add these lines to your `/home/user/Open-RPG/.env` file:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-key-here
```

### Step 4: Create the Database Tables

In your Supabase dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste this and click **Run**:

```sql
-- Enable pgvector (for future semantic search)
create extension if not exists vector;

-- =========================================
-- Table 1: Agent Memory
-- =========================================
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

create index idx_agent_memory_agent_role
  on agent_memory(agent_id, role);

-- =========================================
-- Table 2: Player State
-- =========================================
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

You should see "Success. No rows returned" — that means both tables are created.

### Step 5: Verify

In the Supabase dashboard, go to **Table Editor** (left sidebar). You should see:
- `agent_memory` — empty table with columns: id, agent_id, role, content, metadata, importance, created_at
- `player_state` — empty table with columns: player_id, name, map_id, position_x, position_y, direction, state_data, created_at, updated_at

### Step 6: Tell Cursor to Start TASK-012

Once the tables exist and `.env` has the keys, Cursor can implement `SupabaseAgentMemory`.
The task brief is at `.ai/tasks/TASK-012.md`.

---

## For Railway Deployment (Later)

When deploying to Railway, add the same env vars:

1. In your Railway project, go to **Variables**
2. Add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key

The Supabase project is hosted separately — Railway just connects to it via these env vars.

---

## Free Tier Limits

Supabase free tier includes:
- **500 MB** database storage
- **2 GB** bandwidth
- **50,000** monthly active users (auth)
- Unlimited API requests

For our use case (50 NPCs × ~1,000 messages each = ~25 MB), the free tier is more than enough.
