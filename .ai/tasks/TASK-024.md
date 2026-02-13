## TASK-024: Agent Performance Profiles + Historical Tracking

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 7 (Agent Evaluation Arena)
- **Type**: Create
- **Depends on**: TASK-023 (test results must exist to aggregate)
- **Blocks**: TASK-025 (task assignment reads profiles), TASK-026 (dashboard displays profiles)

### Context

After tests are scored and stored (TASK-023), this task builds the ProfileManager
that aggregates raw test results into per-agent capability profiles. These profiles
power two downstream features: performance-driven task assignment (TASK-025) and
the evaluation dashboard (TASK-026).

Profiles use a rolling average of the last 10 tests per dimension so recent
performance weighs more than old results, allowing agents to "improve" over time.

### Objective

Build the ProfileManager that computes, stores, and queries agent performance
profiles from raw test results. Support time-series history for improvement tracking
and side-by-side agent comparison.

### Specifications

**Create:** `src/agents/evaluation/ProfileManager.ts`

```typescript
export class ProfileManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Recalculate an agent's profile from their test results.
   * Uses rolling average of last 10 results per dimension.
   * Call after every test suite completion.
   */
  async updateProfile(agentId: string): Promise<AgentProfile> {
    // 1. Query agent_test_results joined with agent_tests for this agent
    // 2. Group by test_type (= capability dimension)
    // 3. For each dimension: take last 10 results, compute average score/max_score * 100
    // 4. Compute overall = weighted average of all dimensions (equal weights for now)
    // 5. Upsert into agent_profiles
    // 6. Return updated profile
  }

  /**
   * Get an agent's current profile. Returns null if never tested.
   */
  async getProfile(agentId: string): Promise<AgentProfile | null> {
    // Simple select from agent_profiles
  }

  /**
   * Get score history over time for improvement tracking.
   * Optionally filter by test type/dimension.
   * Returns time-series data for charting.
   */
  async getHistory(agentId: string, testType?: string): Promise<ScorePoint[]> {
    // Query agent_test_results ordered by created_at
    // Return: [{ score, maxScore, date, testName }, ...]
  }

  /**
   * Compare multiple agents side-by-side.
   * Returns profiles for all requested agents.
   */
  async compareAgents(agentIds: string[]): Promise<AgentProfile[]> {
    // Query agent_profiles for all given IDs
    // Return array of profiles for radar chart comparison
  }

  /**
   * Get all agents ranked by overall score.
   * For leaderboard display.
   */
  async getLeaderboard(): Promise<AgentProfile[]> {
    // Select from agent_profiles ordered by overall desc
  }
}
```

**Supporting types** (add to `src/agents/evaluation/types.ts`):

```typescript
export interface ScorePoint {
  score: number
  maxScore: number
  date: string
  testName: string
  testType: string
}

export interface SuiteResult {
  results: TestResult[]
  aggregate: Record<string, number>  // dimension -> average score
  agentId: string
  timestamp: string
}
```

**Rolling average logic:**

```typescript
// For each dimension, take the last 10 test results:
const dimensionScores = results
  .filter(r => r.testType === dimension)
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 10)

const average = dimensionScores.length > 0
  ? dimensionScores.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / dimensionScores.length
  : 0
```

**Profile recalculation trigger:**

Wire `profileManager.updateProfile(agentId)` to be called at the end of
`ExaminerNPC.runSuite()`. After all tests complete, recalculate the profile
immediately so it reflects the latest results.

```typescript
// In ExaminerNPC.runSuite():
const suiteResult = { results, aggregate, agentId, timestamp }
await this.profileManager.updateProfile(agentId)  // <-- add this
return suiteResult
```

This means ExaminerNPC needs a `profileManager` dependency injected via constructor.

### Acceptance Criteria

- [ ] `ProfileManager.updateProfile()` computes rolling averages from last 10 results per dimension
- [ ] `ProfileManager.getProfile()` returns current profile or null
- [ ] `ProfileManager.getHistory()` returns time-series data, optionally filtered by test type
- [ ] `ProfileManager.compareAgents()` returns profiles for multiple agents
- [ ] `ProfileManager.getLeaderboard()` returns all agents ranked by overall score
- [ ] Profile recalculated automatically after `ExaminerNPC.runSuite()`
- [ ] Overall score = equal-weighted average of 6 dimensions
- [ ] Profile upsert (create if new, update if exists)
- [ ] Empty history / no results → profile with all zeros (not error)
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Modify the evaluation schema (TASK-022 handles that)
- Add weighted dimensions (equal weights for MVP; can tune later)
- Build the dashboard UI (TASK-026)
- Add task assignment logic (TASK-025)
- Add pgvector or embeddings
- Build a caching layer (profile reads are infrequent enough to query directly)

### Reference

- Feature idea: `.ai/idea/10-agent-evaluation-arena.md`
- Implementation plan: `.ai/idea/10a-agent-evaluation-implementation-plan.md` (Step 3)
- ExaminerNPC: `src/agents/evaluation/ExaminerNPC.ts` (TASK-023)
- Types: `src/agents/evaluation/types.ts` (TASK-022)
- Supabase client: `src/agents/memory/supabase-client.ts` (TASK-012)

### Handoff Notes

_(To be filled by implementer)_
