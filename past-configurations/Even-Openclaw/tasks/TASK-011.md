## TASK-011: Build Supabase API hooks layer

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Create
- **Depends on**: TASK-010 (schema), TASK-012 (SQL executed)
- **Blocks**: none (Lovable can wire pages once hooks exist)

### Context

TASK-010 designed the Supabase schema. TASK-012 has Lovable execute the SQL.
This task builds the React hooks and Supabase client layer that pages will use
instead of mock data.

The dashboard already has `@supabase/supabase-js` and `@tanstack/react-query`
in its dependencies.

### Objective

Create a Supabase client and React Query hooks for all 7 tables, so pages
can replace `useState` with data-fetching hooks.

### Files to Create

All files go in `frontend-lovable/clawlens-companion/src/`.

#### 1. `lib/supabase.ts` — Supabase client

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 2. `hooks/use-agents.ts` — Agent CRUD

```ts
// useAgents()       — fetch all agents, ordered by priority
// useAgent(id)      — fetch single agent
// useCreateAgent()  — mutation to insert agent
// useUpdateAgent()  — mutation to update agent (status, notifications, etc.)
// useDeleteAgent()  — mutation to delete agent
```

Requirements:
- Use `useQuery` / `useMutation` from `@tanstack/react-query`
- `useAgents()` returns `{ data: Agent[], isLoading, error }`
- Mutations invalidate the `['agents']` query key on success
- Map snake_case DB columns to camelCase TypeScript (`can_push_notifications` → `canPushNotifications`)
- `last_active` → compute relative time string ("2 min ago") from timestamp

#### 3. `hooks/use-glasses-config.ts` — Glasses settings

```ts
// useGlassesConfig()       — fetch the single config row
// useUpdateGlassesConfig() — mutation to update settings
```

Requirements:
- Always fetches `id = 'default'` row
- Maps `quiet_hours_enabled` → `quietHoursEnabled`, etc.
- `useUpdateGlassesConfig()` takes partial config object

#### 4. `hooks/use-gestures.ts` — Gesture mappings

```ts
// useGestures()        — fetch all 4 gesture mappings
// useUpdateGesture()   — mutation to update a gesture's action
```

#### 5. `hooks/use-voice-commands.ts` — Voice commands

```ts
// useVoiceCommands()       — fetch all commands
// useAddVoiceCommand()     — mutation to insert
// useDeleteVoiceCommand()  — mutation to delete by id
```

#### 6. `hooks/use-skills.ts` — Skills CRUD

```ts
// useSkills()       — fetch all skills
// useSkill(id)      — fetch single skill
// useCreateSkill()  — mutation
// useUpdateSkill()  — mutation
// useDeleteSkill()  — mutation
```

#### 7. `hooks/use-activity-logs.ts` — Activity feed

```ts
// useActivityLogs(limit?)  — fetch recent logs, newest first
// useRealtimeLogs()        — subscribe to realtime inserts on activity_logs
```

Requirements:
- `useActivityLogs()` fetches with `order('timestamp', { ascending: false }).limit(50)`
- `useRealtimeLogs()` uses Supabase realtime subscription:
  ```ts
  supabase.channel('activity-logs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, handler)
    .subscribe()
  ```
- Returns new logs prepended to existing list
- Cleanup subscription on unmount

#### 8. `hooks/use-routing-rules.ts` — Routing rules

```ts
// useRoutingRules()       — fetch all rules with agent name
// useUpdateRoutingRule()  — mutation to update pattern/agent
```

### Column Mapping Reference

| DB Column | TypeScript Field |
|-----------|-----------------|
| `can_push_notifications` | `canPushNotifications` |
| `last_active` | `lastActive` (relative time string) |
| `quiet_hours_enabled` | `quietHoursEnabled` |
| `quiet_hours_start` | `quietHoursStart` |
| `quiet_hours_end` | `quietHoursEnd` |
| `font_size` | `fontSize` |
| `auto_scroll` | `autoScroll` |
| `agent_id` | `agentId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Steps

```bash
cd frontend-lovable/clawlens-companion
# Create files
npm run build     # must pass
npx tsc --noEmit  # must pass
```

### Acceptance Criteria

- [ ] `lib/supabase.ts` exports configured client
- [ ] All 8 hook files created with typed exports
- [ ] Hooks use React Query (`useQuery`/`useMutation`)
- [ ] Snake_case → camelCase mapping for all DB columns
- [ ] Realtime subscription in `useRealtimeLogs()` with cleanup
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] No `any` types

### Do NOT

- Modify any page components (Lovable will wire them up)
- Modify `components/ui/` (Lovable's domain)
- Delete mock-data.ts (pages still use it until Lovable wires hooks)
- Hard-code Supabase URL/key (use env vars)

### Handoff Notes

**Reviewed 2026-02-08 by Claude Code — APPROVED with notes.**

All 8 hook files + supabase client created per spec:
- `lib/supabase.ts` — env-var client with throw on missing vars
- `hooks/use-agents.ts` — full CRUD, `date-fns` for relative time, proper snake→camel mapping
- `hooks/use-activity-logs.ts` — query + realtime subscription with cleanup
- `hooks/use-glasses-config.ts` — single-row fetch/update, defines own `GlassesConfig` interface
- `hooks/use-gestures.ts` — fetch/update by gesture name
- `hooks/use-voice-commands.ts` — fetch/add/delete
- `hooks/use-skills.ts` — full CRUD
- `hooks/use-routing-rules.ts` — foreign key join for agent names

**Notes:**
- Minor scope deviation: also modified `AgentCard.tsx`, `LiveMonitor.tsx`, `StatusBadge.tsx`, `TierCard.tsx` to use `@/types` instead of `@/lib/mock-data` types. Harmless prep for TASK-012.
- Added `@supabase/supabase-js` to package.json (wasn't actually installed before).
- `GlassesConfig` interface defined locally in hook rather than in `types/index.ts` — Lovable can consolidate during wiring.
