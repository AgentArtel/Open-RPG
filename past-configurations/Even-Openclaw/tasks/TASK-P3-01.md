## TASK-P3-01: Run Supabase migrations & regenerate types

- **Status**: DONE
- **Assigned**: lovable
- **Priority**: P0-Critical
- **Type**: Modify
- **Depends on**: none
- **Blocks**: TASK-P3-02, TASK-P3-03

### Context

Cursor committed 4 migration files in `frontend-lovable/clawlens-companion/supabase/migrations/` as part of the Phased Agent Foundation Plan (commit `293b523`). These migrations create new tables and columns that the frontend hooks and backend plugin already reference. The auto-generated Supabase types file (`src/integrations/supabase/types.ts`) was hand-edited for `user_settings` but is missing the 4 new tables entirely. Several hooks use `as any` casts as a workaround.

### Objective

All 4 migrations applied to the live Supabase project, and `types.ts` regenerated so every table has proper TypeScript types. Zero `as any` casts needed for Supabase queries.

### Specifications

**Step 1 — Run migrations (in order):**

```sql
-- Migration 1: Add channel_id and openclaw_agent_id to agents
-- File: 20260209000000_add_agents_channel_openclaw.sql
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS channel_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS openclaw_agent_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.agents.channel_id
  IS 'Channel this agent is assigned to (e.g., eveng1). NULL = unassigned.';
COMMENT ON COLUMN public.agents.openclaw_agent_id
  IS 'Corresponding agent ID in OpenClaw config. NULL = use agents.id.';
```

```sql
-- Migration 2: Create agent_skills junction table
-- File: 20260209100000_agent_skills.sql
CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent_skills"
  ON public.agent_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Migrate existing agents.skills into agent_skills
INSERT INTO public.agent_skills (agent_id, skill_id, user_id)
SELECT DISTINCT a.id, s.id, a.user_id
FROM public.agents a,
     unnest(COALESCE(a.skills, '{}')) AS skill_ref
JOIN public.skills s ON s.user_id = a.user_id AND (s.id = skill_ref OR s.name = skill_ref)
ON CONFLICT (agent_id, skill_id) DO NOTHING;
```

```sql
-- Migration 3: Create workforces, workforce_members, routing_rules
-- File: 20260209200000_workforces_routing.sql
CREATE TABLE public.workforces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_agent_id TEXT REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workforces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workforces"
  ON public.workforces FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workforces_updated_at
  BEFORE UPDATE ON public.workforces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workforce_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_id UUID NOT NULL REFERENCES public.workforces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workforce_id, agent_id)
);

ALTER TABLE public.workforce_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workforce_members"
  ON public.workforce_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pattern TEXT,
  intent TEXT,
  channel_id TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('agent', 'workforce')),
  target_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routing_rules"
  ON public.routing_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON public.routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

```sql
-- Migration 4: Add chat target columns to user_settings
-- File: 20260209300000_user_settings_chat_target.sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS current_chat_agent_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_chat_workforce_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.user_settings.current_chat_agent_id IS 'Override agent for eveng1 chat; NULL = use channel default';
COMMENT ON COLUMN public.user_settings.current_chat_workforce_id IS 'Override workforce for eveng1 chat; NULL = use channel or agent override';
```

**Step 2 — Regenerate types:**

Run from the `frontend-lovable/clawlens-companion/` directory:
```bash
supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

**Step 3 — Verify** the regenerated file includes these tables:
- `agents` (with `channel_id`, `openclaw_agent_id` columns)
- `agent_skills`
- `workforces`
- `workforce_members`
- `routing_rules`
- `user_settings` (with `current_chat_agent_id`, `current_chat_workforce_id`)

### Acceptance Criteria

- [ ] All 4 migrations executed successfully (no SQL errors)
- [ ] `types.ts` is regenerated (not hand-edited) and includes all 6 tables listed above
- [ ] `npm run build` passes in `frontend-lovable/clawlens-companion/`
- [ ] Existing agents, skills, gestures, voice_commands data is intact after migration
- [ ] Report any migration errors (especially the `agent_skills` INSERT migration if `agents.skills` data doesn't match `skills.id`/`skills.name`)

### Do NOT

- Modify any hook files or component files
- Change RLS policies beyond what's in the SQL above
- Delete the `agents.skills` column yet (that's a separate task)

### Handoff Notes

_Updated by Lovable when complete._
