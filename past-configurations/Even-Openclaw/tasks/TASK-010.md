## TASK-010: Design Supabase schema and write migration SQL

- **Status**: DONE
- **Assigned**: claude-code
- **Priority**: P0-Critical
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-011, TASK-012

### Objective

Design the database schema for ClawLens and provide exact migration SQL
for Lovable to execute in Supabase.

### Migration SQL

Lovable: run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

```sql
-- ============================================================
-- ClawLens Supabase Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. AGENTS TABLE
-- Stores agent configurations (Personal Assistant, Research, Code, etc.)
create table public.agents (
  id text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'idle' check (status in ('active', 'idle', 'error', 'offline')),
  skills text[] not null default '{}',
  can_push_notifications boolean not null default true,
  priority integer not null default 1,
  last_active timestamptz not null default now(),
  tier text not null default 'local' check (tier in ('edge', 'local', 'cloud')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed with default agents
insert into public.agents (id, name, description, status, skills, can_push_notifications, priority, tier) values
  ('assistant', 'Personal Assistant', 'General purpose assistant for daily tasks, scheduling, and Q&A', 'idle', '{calendar,tasks,weather,reminders}', true, 1, 'local'),
  ('research', 'Research Agent', 'Deep research on technical topics with web search and summarization', 'active', '{web_search,arxiv,summarize,citations}', false, 2, 'cloud'),
  ('code', 'Code Assistant', 'Programming help, code review, and technical debugging', 'idle', '{code_gen,debug,review,docs}', true, 3, 'local'),
  ('briefing', 'Morning Briefing', 'Daily summary of calendar, tasks, news, and priorities', 'idle', '{summarize,calendar,news,tasks}', true, 4, 'edge');


-- 2. GLASSES_CONFIG TABLE
-- Single-row table for glasses display settings
create table public.glasses_config (
  id text primary key default 'default',
  brightness integer not null default 80 check (brightness between 0 and 100),
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  auto_scroll boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  updated_at timestamptz not null default now()
);

-- Seed with defaults
insert into public.glasses_config (id) values ('default');


-- 3. GESTURE_MAPPINGS TABLE
create table public.gesture_mappings (
  id serial primary key,
  gesture text not null unique check (gesture in ('single', 'double', 'triple', 'long')),
  action text not null,
  description text not null default ''
);

-- Seed with defaults
insert into public.gesture_mappings (gesture, action, description) values
  ('single', 'next_page', 'Show next page of response'),
  ('double', 'dismiss', 'Clear current display'),
  ('triple', 'cycle_agent', 'Cycle to next active agent'),
  ('long', 'new_query', 'Start new voice query');


-- 4. VOICE_COMMANDS TABLE
create table public.voice_commands (
  id serial primary key,
  trigger text not null,
  action text not null,
  agent_id text references public.agents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed with defaults
insert into public.voice_commands (trigger, action, agent_id) values
  ('status', 'show_agent_dashboard', 'assistant'),
  ('tasks', 'show_todo_list', 'assistant'),
  ('brief me', 'morning_briefing', 'briefing'),
  ('research', 'activate_research_mode', 'research'),
  ('code', 'activate_code_mode', 'code');


-- 5. SKILLS TABLE
create table public.skills (
  id text primary key,
  name text not null,
  description text not null default '',
  content text not null default '',
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed with defaults
insert into public.skills (id, name, description, content, category) values
  ('research-assistant', 'Research Assistant', 'Deep research with web search and academic sources', '# Research Assistant Skill\n\n## Overview\nYou are a research assistant that helps users find, analyze, and summarize information from multiple sources.\n\n## Capabilities\n- Web search for current information\n- arXiv paper retrieval\n- Academic source analysis\n- Citation extraction\n- Summary generation', 'productivity'),
  ('web-search', 'Web Search', 'Search the web and summarize results', '# Web Search Skill\n\n## Overview\nSearch the web for current information and provide summarized results.', 'research'),
  ('calendar-manager', 'Calendar Manager', 'Read and create calendar events', '# Calendar Manager Skill\n\n## Overview\nManage calendar events, scheduling, and reminders.', 'productivity'),
  ('code-reviewer', 'Code Reviewer', 'Analyze PRs and suggest improvements', '# Code Reviewer Skill\n\n## Overview\nReview code changes, analyze PRs, and suggest improvements.', 'development');


-- 6. ACTIVITY_LOGS TABLE
create table public.activity_logs (
  id bigint generated always as identity primary key,
  timestamp timestamptz not null default now(),
  type text not null check (type in ('voice', 'agent', 'system', 'gesture')),
  source text not null,
  message text not null,
  agent_id text references public.agents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Index for fast log retrieval (newest first)
create index idx_activity_logs_timestamp on public.activity_logs (timestamp desc);

-- Seed with sample activity
insert into public.activity_logs (timestamp, type, source, message, agent_id) values
  (now() - interval '5 minutes', 'voice', 'User', 'What are the latest advances in quantum computing?', 'research'),
  (now() - interval '5 minutes' + interval '3 seconds', 'system', 'Router', 'Query classified as Tier 3 (Cloud) - Complex research topic', null),
  (now() - interval '5 minutes' + interval '5 seconds', 'agent', 'Research Agent', 'Initiating search across arXiv and recent publications...', 'research'),
  (now() - interval '6 minutes', 'gesture', 'TouchBar', 'Single tap - Next page', null),
  (now() - interval '6 minutes' - interval '3 seconds', 'agent', 'Assistant', 'Your morning briefing is ready. 3 new tasks assigned.', 'assistant'),
  (now() - interval '8 minutes', 'voice', 'User', 'Status', 'assistant'),
  (now() - interval '10 minutes', 'system', 'Heartbeat', 'All agents operational. 4 active connections.', null);


-- 7. ROUTING_RULES TABLE
create table public.routing_rules (
  id serial primary key,
  pattern text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  priority integer not null default 1
);

-- Seed with defaults
insert into public.routing_rules (pattern, agent_id, priority) values
  ('Status, Tasks, Brief me', 'assistant', 1),
  ('Research, Find, Analyze', 'research', 2),
  ('Code, Debug, Review', 'code', 3);


-- 8. UPDATED_AT TRIGGER
-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.handle_updated_at();

create trigger glasses_config_updated_at
  before update on public.glasses_config
  for each row execute function public.handle_updated_at();

create trigger skills_updated_at
  before update on public.skills
  for each row execute function public.handle_updated_at();


-- 9. ROW LEVEL SECURITY
-- For now, allow all operations (no auth yet).
-- We'll add proper RLS policies when auth is implemented.
alter table public.agents enable row level security;
alter table public.glasses_config enable row level security;
alter table public.gesture_mappings enable row level security;
alter table public.voice_commands enable row level security;
alter table public.skills enable row level security;
alter table public.activity_logs enable row level security;
alter table public.routing_rules enable row level security;

-- Permissive policies (allow all for now)
create policy "Allow all on agents" on public.agents for all using (true) with check (true);
create policy "Allow all on glasses_config" on public.glasses_config for all using (true) with check (true);
create policy "Allow all on gesture_mappings" on public.gesture_mappings for all using (true) with check (true);
create policy "Allow all on voice_commands" on public.voice_commands for all using (true) with check (true);
create policy "Allow all on skills" on public.skills for all using (true) with check (true);
create policy "Allow all on activity_logs" on public.activity_logs for all using (true) with check (true);
create policy "Allow all on routing_rules" on public.routing_rules for all using (true) with check (true);


-- 10. REALTIME
-- Enable realtime for tables that need live updates
alter publication supabase_realtime add table public.agents;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.glasses_config;
```

### Schema Summary

| Table | Purpose | Realtime |
|-------|---------|----------|
| `agents` | Agent configs (name, tier, skills, status, notifications) | Yes |
| `glasses_config` | Single-row display settings (brightness, font, quiet hours) | Yes |
| `gesture_mappings` | TouchBar gesture → action mappings (4 rows) | No |
| `voice_commands` | Voice trigger → action mappings | No |
| `skills` | Skill definitions with markdown content | No |
| `activity_logs` | Event stream (voice, agent, system, gesture) | Yes |
| `routing_rules` | Query pattern → agent routing rules | No |

### Handoff Notes

SQL is ready. Lovable executes it in TASK-012.
Cursor builds the React hooks layer in TASK-011.
