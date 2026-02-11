## TASK-P3-03: Wire remaining integration gaps

- **Status**: PARTIAL (port doc, drop skills migration, use-agents skills done; remaining: resolveAgentForUser)
- **Assigned**: cursor
- **Priority**: P1-High
- **Type**: Modify
- **Depends on**: TASK-P3-01 ✅
- **Blocks**: none

### Context

After the Phased Agent Foundation Plan (commit `293b523`), several features were partially wired. Cursor addressed most items in commits `86bb753` and `848c018`:

**Done:**
- Port remapping comment in eveng1-channel.ts
- Drop `agents.skills` column migration (`20260209400000`)
- `use-agents.ts` batch-loads skills from `agent_skills` table
- Agent cards show real skill badges from junction table

**Remaining:**
- Backend `resolveAgentForUser()` — deferred until user identity is threaded through WebSocket

**Done so far:** Port 18789→3377 documented in eveng1-channel.ts; migration to drop `agents.skills` added and run; `use-agents` derives skills from `agent_skills`; agent cards show skills. **Remaining:** Optional backend `resolveAgentForUser()` to honor Chat “Chat with” selection from `user_settings.current_chat_agent_id`.

### Objective

End-to-end data flow works for: agent channel assignment → backend routing, chat target selector → backend agent resolution, and the deprecated `agents.skills` column is removed.

### Specifications

#### 1. Backend: Read `current_chat_agent_id` from user settings (eveng1-channel.ts)

The Chat page lets users select which agent/workforce to chat with and stores it in `user_settings.current_chat_agent_id`. Currently the backend `agent-resolver.ts` ignores this — it just picks the agent with `channel_id = 'eveng1'`.

**Enhancement to `agent-resolver.ts`:**

Add a new export that checks user settings first:

```typescript
/**
 * Resolve agent for a user's chat session.
 * Priority: user_settings.current_chat_agent_id > channel assignment > null
 */
export async function resolveAgentForUser(
  userId: string,
  channelId: string
): Promise<ResolvedAgent | null> {
  const client = getSupabase();
  if (!client) return null;

  // Check user_settings override
  const { data: settings } = await client
    .from('user_settings')
    .select('current_chat_agent_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (settings?.current_chat_agent_id) {
    const { data: agent } = await client
      .from('agents')
      .select('id, name, openclaw_agent_id, status, user_id')
      .eq('id', settings.current_chat_agent_id)
      .eq('status', 'active')
      .maybeSingle();

    if (agent) {
      // Load skills for this agent
      const skills = await loadAgentSkills(client, agent.id, agent.user_id);
      return {
        agentId: agent.openclaw_agent_id ?? agent.id,
        supabaseAgentId: agent.id,
        name: agent.name,
        skills,
      };
    }
  }

  // Fallback to channel assignment
  return resolveAgentForChannel(channelId);
}
```

Extract the skills-loading logic into a shared `loadAgentSkills()` helper to avoid duplication.

**Note:** The eveng1 channel currently has no user identity (single-user, no auth). For now, this function exists but won't be called from `eveng1-channel.ts` until user identity is threaded through the WebSocket connection. The function should still be implemented and exported for future use and for the dashboard to call directly.

#### 2. Backend: Document port remapping heuristic

In `eveng1-channel.ts` line 133:
```typescript
const port = channelConfig.port === 18789 ? 3377 : (channelConfig.port ?? 3377);
```

Add a comment explaining why:
```typescript
// Port 18789 is the OpenClaw gateway port. When config inherits this default,
// remap to 3377 for the eveng1 WebSocket server (which runs alongside the gateway).
const port = channelConfig.port === 18789 ? 3377 : (channelConfig.port ?? 3377);
```

#### 3. Migration: Drop deprecated `agents.skills` column

Create a new migration file:

**File:** `supabase/migrations/20260210000000_drop_agents_skills_column.sql`

```sql
-- Drop the deprecated agents.skills text[] column.
-- Skills are now managed via the agent_skills junction table (migration 20260209100000).
-- Data was migrated in that migration; this column is no longer read by any code.
ALTER TABLE public.agents DROP COLUMN IF EXISTS skills;
```

**Important:** Before running this, verify that:
- The `agent_skills` migration (20260209100000) has been applied
- No frontend code reads `agents.skills` directly (the `useAgents()` hook maps `row.skills || []` but this can be updated to return `[]` always)
- Update the `toAgent` mapper in `use-agents.ts` to remove the `skills: row.skills || []` line and instead always return `skills: []` (skills are now loaded separately via `useAgentSkills()`)

**Update `use-agents.ts`:**
```typescript
// BEFORE
const toAgent = (row: any): Agent => ({
  ...
  skills: row.skills || [],
  ...
});

// AFTER
const toAgent = (row: any): Agent => ({
  ...
  skills: [],  // Skills now loaded via useAgentSkills() from agent_skills table
  ...
});
```

**Update `types/index.ts`** — The `Agent.skills` field can remain as `string[]` for backward compatibility with the card display, but it will always be empty. The real skill data comes from `useAgentSkills()`.

#### 4. Frontend: Agent card skill badges from agent_skills

Currently `AgentManagement.tsx` renders `agent.skills.slice(0, 3)` on each card (lines 435-451). Since `agents.skills` is being deprecated, these badges will be empty.

Two options (pick one):
- **Option A (simple):** Remove the skill badges from the agent card entirely. The detail panel's `<SkillsSection>` already shows real skills.
- **Option B (full):** Create a lightweight `useAgentSkillNames(agentId)` hook or batch-load skill names in `useAgents()` via a join. Display those on the card.

**Recommended: Option A** — simpler, and the detail panel already works correctly.

### Acceptance Criteria

- [ ] `resolveAgentForUser()` exported from `agent-resolver.ts` with skills loading
- [ ] Port remapping has explanatory comment
- [ ] New migration `20260210000000_drop_agents_skills_column.sql` exists
- [ ] `use-agents.ts` `toAgent` returns `skills: []` instead of `row.skills || []`
- [ ] Agent cards handle empty `skills` array gracefully (no broken UI)
- [ ] `npm run build` passes for both `frontend-lovable/` and `ai-agent-backend/extensions/eveng1/`
- [ ] No regressions in agent CRUD, skill assignment, or routing rules

### Do NOT

- Thread user identity through the WebSocket connection (deferred to Phase 4+)
- Modify `src/components/ui/` (Lovable's design system)
- Change the Workforces page or routing rules UI
- Run the `DROP COLUMN` migration without confirming TASK-P3-01 is complete

### Handoff Notes

- **Done:** Port remapping (eveng1-channel), drop `agents.skills` migration, `use-agents` skills from `agent_skills`, agent cards show skills.
- **Remaining (optional):** Backend `resolveAgentForUser(userId, channelId)` in agent-resolver/eveng1 to read `user_settings.current_chat_agent_id` so Chat "Chat with" selection is honored; fallback to `resolveAgentForChannel(channelId)`. Spec in this task.
