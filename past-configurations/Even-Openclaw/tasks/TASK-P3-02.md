## TASK-P3-02: Replace all mock data with real Supabase hooks

- **Status**: DONE (commit d120c2b)
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Refactor
- **Depends on**: TASK-P3-01 ✅
- **Blocks**: none

### Context

Multiple dashboard pages still import from `src/lib/mock-data.ts` or use inline hardcoded arrays instead of querying real data from Supabase. The hooks already exist for most data sources. After TASK-P3-01 runs the migrations and regenerates types, this task removes every mock import and wires real data.

Cursor audit identified these mock data locations:

| File | Mock Data | Real Source |
|------|-----------|-------------|
| `src/lib/mock-data.ts` | 7 exports (agents, tiers, logs, connection, display, gestures, skills) | All have hooks |
| `components/LiveMonitor.tsx` | `mockConnectionStatus`, `mockActivityLogs`, `mockGlassesDisplay` | `useGatewayConnection()`, `useActivityLogs()` |
| `pages/Dashboard.tsx` | Hardcoded `glassesDisplay` state (lines 30-37) | Real glasses state or sensible defaults |
| `pages/ComputeTiers.tsx` | Hardcoded tiers array, fake S24 metrics (87% battery) | Static config OK for tiers; remove fake device metrics |
| `pages/AgentStudio.tsx` | `defaultSkill`, `sampleResponse`, fake ClawHub marketplace, fake templates | `useSkills()` for first skill; remove fake marketplace |

### Objective

Zero imports of `mock-data.ts`. Every data display in the dashboard comes from real Supabase queries or clearly-labeled placeholders (e.g. "Not connected" rather than fake numbers). Delete `mock-data.ts` entirely.

### Specifications

#### 1. LiveMonitor.tsx

Replace:
- `mockConnectionStatus` → use `useGatewayConnection()` hook (already exists)
- `mockActivityLogs` → use `useActivityLogs()` hook (already exists in `use-activity-logs.ts`)
- `mockGlassesDisplay` → show a "No active display" placeholder or derive from latest agent response

Remove the `import` from `mock-data`.

#### 2. Dashboard.tsx

Replace the hardcoded `glassesDisplay` useState:
```tsx
// BEFORE
const [glassesDisplay] = useState<GlassesDisplay>({
  currentText: 'Agent "Research" is analyzing...',
  ...
});

// AFTER — show real state or empty
const [glassesDisplay] = useState<GlassesDisplay>({
  currentText: '',
  pageNumber: 0,
  totalPages: 0,
  isTyping: false,
  brightness: 80,
  fontSize: 'medium',
});
```

Update any display that references this to show "No active display" when `currentText` is empty.

#### 3. ComputeTiers.tsx

- The `tiers` array is hardware config, not user data — keep it but move to a `const` at module level or a shared config file. This is acceptable as static config.
- **Remove the fake device stats** (87% battery, 38°C temp, 23% NPU, WiFi 6). Replace with "—" or "Not connected" indicators until real Galaxy S24 telemetry is available.
- The `agentCapabilities` matrix is reference documentation — OK to keep as static.

#### 4. AgentStudio.tsx

- Remove `defaultSkill` constant. Instead, initialize with the first skill from `useSkills()` or show an empty editor with a "Select or create a skill" prompt.
- Remove `sampleResponse` hardcoded text. Show "Run a test to see the response" instead.
- Remove the fake ClawHub marketplace section (4 hardcoded plugins). Replace with "Coming soon" or remove the section entirely.
- Remove the fake skill templates (Research, Code, Tasks, Briefing with emojis). Either pull from `useSkills()` categories or remove.

#### 5. Delete mock-data.ts

After all imports are removed, delete `src/lib/mock-data.ts`.

#### 6. Remove `as any` casts (if types are regenerated)

In these hooks, replace `(supabase as any)` with properly typed `supabase`:
- `src/hooks/use-user-settings.ts` — lines 85, 121, 129, 144
- `src/hooks/use-workforces.ts` — `toWorkforce` and `toWorkforceMember` parameter types
- `src/hooks/use-routing-rules.ts` — `toRoutingRule` parameter type
- `src/hooks/use-agents.ts` — line 124 `Record<string, any>` → `Record<string, unknown>`

**Only do this step if TASK-P3-01 has been completed and types include the new tables.** If types are still missing, leave the casts and note it in handoff.

### Acceptance Criteria

- [ ] `mock-data.ts` is deleted
- [ ] Zero imports of `mock-data` anywhere in `src/`
- [ ] LiveMonitor shows real connection status and activity logs (or empty state)
- [ ] Dashboard shows empty/placeholder glasses display (not fake text)
- [ ] ComputeTiers shows "—" for device stats instead of fake numbers
- [ ] AgentStudio loads skills from DB, no hardcoded defaultSkill
- [ ] `npm run build` passes with no errors
- [ ] `npx tsc --noEmit` passes (no type errors)

### Do NOT

- Modify `src/components/ui/` (Lovable's design system)
- Change the visual layout or styling of any component
- Add new features — this is strictly replacing mock data with real data
- Modify any backend files (`ai-agent-backend/`)
- Touch `Landing.tsx` (marketing content is OK as static)
- Touch `GlassesConfig.tsx` default gestures fallback (correct behavior)

### Handoff Notes

_Updated by Cursor when complete._
