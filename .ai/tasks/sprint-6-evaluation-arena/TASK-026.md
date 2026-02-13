## TASK-026: Evaluation Dashboard (Lovable UI)

- **Status**: PENDING
- **Assigned**: lovable
- **Priority**: P2-Medium
- **Phase**: 7 (Agent Evaluation Arena)
- **Type**: Create
- **Depends on**: TASK-022 (schema), TASK-024 (profiles)
- **Blocks**: None

### Context

The evaluation infrastructure (TASK-022-025) runs server-side and stores results in
Supabase. This task builds the frontend dashboard in the Lovable app so project
owners can view agent performance, track improvement over time, compare agents,
and trigger new evaluation runs.

The Lovable frontend already exists as a separate app that embeds the RPGJS game
via iframe and has Supabase connectivity.

### Objective

A dedicated evaluation dashboard page in the Lovable frontend showing agent
performance profiles, score history charts, recent test results, and agent
comparison views.

### Specifications

**Create in Lovable frontend:**
- Evaluation page (`/evaluations` route or tab)
- Agent selector dropdown
- Capability dimension cards with scores
- Improvement-over-time line chart
- Recent test results table
- Agent comparison view (radar chart)

**Dashboard Layout:**

```
┌────────────────────────────────────────────────────┐
│  Agent Evaluations            [Clara ▼] [All Tests]│
├────────────────────────────────────────────────────┤
│                                                    │
│  Overall: 79/100    Tests: 24    Last: 2h ago      │
│                                                    │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │Creativity│ Tool Use │  Social  │Reasoning │     │
│  │  ██████  │  █████   │  █████   │  ███     │     │
│  │   92     │   88     │   85     │   63     │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
│  ┌──────────┬──────────┐                           │
│  │  Memory  │Adaptable │                           │
│  │  ████    │  ████    │                           │
│  │   71     │   68     │                           │
│  └──────────┴──────────┘                           │
│                                                    │
│  Improvement Over Time          [7d] [30d] [All]   │
│  100┤                                              │
│   80┤    ╱──────────╲╱───────────                  │
│   60┤───╱                                          │
│   40┤                                              │
│     └──┬──────┬──────┬──────┬──                    │
│      Feb 13  Feb 14  Feb 15  Feb 16                │
│                                                    │
│  Recent Tests                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Test Name          Type        Score   When  │   │
│  │ Portfolio Review    creativity  92/100  2h    │   │
│  │ Logic Puzzle        reasoning   58/100  2h    │   │
│  │ Empathy Test        social      91/100  3h    │   │
│  │ Error Recovery      tool_use    85/100  1d    │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  [Run Evaluation]  [Compare Agents]  [Export CSV]  │
└────────────────────────────────────────────────────┘
```

**Data Sources (Supabase queries):**

```typescript
// Current profile for selected agent
const { data: profile } = await supabase
  .from('agent_profiles')
  .select('*')
  .eq('agent_id', selectedAgentId)
  .single()

// Score history for improvement chart
const { data: history } = await supabase
  .from('agent_test_results')
  .select('score, max_score, created_at, agent_tests(name, test_type)')
  .eq('agent_id', selectedAgentId)
  .order('created_at', { ascending: true })
  .limit(100)

// Recent test results
const { data: recent } = await supabase
  .from('agent_test_results')
  .select('score, max_score, response_text, latency_ms, created_at, agent_tests(name, test_type)')
  .eq('agent_id', selectedAgentId)
  .order('created_at', { ascending: false })
  .limit(20)

// All agents for dropdown + comparison
const { data: agents } = await supabase
  .from('agent_profiles')
  .select('*')
  .order('overall', { ascending: false })
```

**"Run Evaluation" button:**

Triggers a test suite via API call to the game server:

```typescript
// POST to game server endpoint
const response = await fetch(`${GAME_SERVER_URL}/api/evaluate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agentId: selectedAgentId })
})
```

The game server endpoint is NOT part of this task — it's a stretch goal or future
enhancement. For MVP, the button can show a "Coming soon" tooltip or be disabled.

**"Compare Agents" view:**

When clicked, shows a multi-select to pick 2-4 agents, then displays a side-by-side
view with radar charts showing all 6 dimensions for each agent.

**"Export CSV" button:**

Downloads `agent_test_results` for the selected agent as a CSV file. Client-side
generation from the Supabase query results.

**Chart library:**

Use whatever charting library Lovable supports well (Recharts, Chart.js, or
lightweight alternatives). Line chart for improvement-over-time, radar chart for
agent comparison.

### Acceptance Criteria

- [ ] Evaluation page accessible at `/evaluations` route
- [ ] Agent selector dropdown populated from `agent_profiles`
- [ ] Six capability dimension cards show current scores with visual bars
- [ ] Overall score prominently displayed with total tests and last tested time
- [ ] Improvement-over-time line chart with time range filters (7d, 30d, all)
- [ ] Recent tests table shows test name, type, score, and relative timestamp
- [ ] Compare Agents view with radar charts for 2-4 agents
- [ ] Export CSV downloads test results for selected agent
- [ ] Empty state when no evaluation data exists
- [ ] Mobile-responsive layout
- [ ] Supabase anon key used for read queries

### Do NOT

- Build the server-side evaluation trigger endpoint (future task)
- Add real-time subscriptions (polling or manual refresh is fine)
- Add user authentication (project owner access for MVP)
- Modify game server or RPGJS code — this is frontend-only
- Build the paid evaluation service UI (future task, beyond Phase 7)
- Add test editing or creation from the dashboard (admin feature, future)

### Reference

- Feature idea: `.ai/idea/10-agent-evaluation-arena.md`
- Implementation plan: `.ai/idea/10a-agent-evaluation-implementation-plan.md` (Step 5)
- Schema: `supabase/migrations/004_agent_evaluation.sql` (TASK-022)
- Profiles: `src/agents/evaluation/ProfileManager.ts` (TASK-024)
- Similar UI: TASK-021 (Lovable Feed UI — same frontend app)
- Dashboard wireframe in implementation plan

### Handoff Notes

_(To be filled by implementer)_
