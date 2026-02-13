## TASK-022: Evaluation Schema + Test Definitions

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 7 (Agent Evaluation Arena)
- **Type**: Create
- **Depends on**: Supabase project setup (TASK-012 migration pattern)
- **Blocks**: TASK-023 (Examiner NPC), TASK-024 (Profiles), TASK-026 (Dashboard)

### Context

The Agent Evaluation Arena needs a structured way to define tests, store results,
and track agent performance over time. This task creates the Supabase tables and
seeds them with a starter test suite covering six capability dimensions: creativity,
tool_use, memory, social, reasoning, and adaptability.

This is pure infrastructure — no runtime code, just schema and seed data.

### Objective

Create the database schema for agent evaluation (3 tables + indexes) and populate
it with 12 starter tests across 6 capability dimensions.

### Specifications

**Create:** `supabase/migrations/004_agent_evaluation.sql`

```sql
-- Test definitions (what gets tested and how)
create table agent_tests (
  id            uuid primary key default gen_random_uuid(),
  test_type     text not null,               -- capability dimension
  name          text not null,
  description   text,
  prompt        text not null,               -- challenge presented to the agent
  rubric        jsonb not null,              -- scoring criteria for LLM-as-judge
  expected      jsonb,                       -- for factual tests: expected answers
  max_score     integer default 100,
  difficulty    text default 'standard',     -- 'basic', 'standard', 'advanced'
  category      text,                        -- maps to capability dimension
  created_at    timestamptz default now()
);

-- Individual test results
create table agent_test_results (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  test_id       uuid references agent_tests,
  score         integer not null,
  max_score     integer not null,
  details       jsonb default '{}',          -- per-criterion breakdown
  response_text text,                        -- agent's actual response
  model_used    text,                        -- which LLM model was used
  latency_ms    integer,
  token_usage   jsonb,                       -- { prompt_tokens, completion_tokens }
  session_id    text,                        -- game session identifier
  created_at    timestamptz default now()
);

-- Aggregated performance profiles
create table agent_profiles (
  agent_id      text primary key,
  creativity    float default 0,
  tool_use      float default 0,
  memory_score  float default 0,
  social        float default 0,
  reasoning     float default 0,
  adaptability  float default 0,
  overall       float default 0,
  total_tests   integer default 0,
  last_tested   timestamptz,
  updated_at    timestamptz default now()
);

create index idx_test_results_agent on agent_test_results(agent_id, created_at);
create index idx_test_results_type on agent_test_results(agent_id, test_id);
```

**Create:** `supabase/seed/evaluation-tests.sql`

Seed `agent_tests` with 12 starter tests (2 per dimension):

| test_type | name | prompt (summary) | rubric focus |
|-----------|------|-------------------|--------------|
| creativity | Portfolio Review | "Describe a scene that captures beauty in an unexpected place" | originality, imagery, emotional depth |
| creativity | Improvisation | "A player asks for something you've never been asked before. Respond in character." | spontaneity, coherence, character consistency |
| memory | Recent Recall | "What happened in your last 3 conversations?" | accuracy, specificity, chronological order |
| memory | Detail Recall | "What was the name of the player who asked about [X]?" | precision, confidence calibration |
| reasoning | Logic Puzzle | "If A leads to B, and B leads to C, what happens if A fails?" | logical chain, edge cases, clarity |
| reasoning | Multi-Step Plan | "A player needs to reach the mountain. Plan the safest route using what you know." | step sequencing, contingencies, practicality |
| social | Empathy Test | "A player tells you their pet died. Respond." | empathy, tone, brevity, sincerity |
| social | Conflict Resolution | "Two players argue in front of you. Mediate." | neutrality, de-escalation, fairness |
| tool_use | Skill Execution | "Generate an image of [specific thing]. Describe your process." | correct tool selection, parameter accuracy |
| tool_use | Error Recovery | "Your tool failed with an error. What do you do?" | graceful handling, user communication, alternatives |
| adaptability | New Environment | "You've been moved to a dungeon you've never seen. React." | environmental awareness, character consistency |
| adaptability | Role Shift | "A player asks you to do something outside your specialty." | self-awareness, helpful redirect, flexibility |

Each test's `rubric` field should be a JSON object with 3-4 scoring criteria, each
worth 25 points, totaling `max_score: 100`. Example:

```json
{
  "criteria": [
    { "name": "originality", "weight": 25, "description": "Response shows creative, non-generic thinking" },
    { "name": "imagery", "weight": 25, "description": "Uses vivid, sensory language" },
    { "name": "emotional_depth", "weight": 25, "description": "Evokes genuine emotional response" },
    { "name": "coherence", "weight": 25, "description": "Response is well-structured and makes sense" }
  ]
}
```

**TypeScript types:** `src/agents/evaluation/types.ts`

```typescript
export interface AgentTest {
  id: string
  testType: string
  name: string
  description?: string
  prompt: string
  rubric: TestRubric
  expected?: Record<string, unknown>
  maxScore: number
  difficulty: string
  category?: string
}

export interface TestRubric {
  criteria: RubricCriterion[]
}

export interface RubricCriterion {
  name: string
  weight: number
  description: string
}

export interface TestResult {
  id: string
  agentId: string
  testId: string
  score: number
  maxScore: number
  details: Record<string, number>  // per-criterion scores
  responseText?: string
  modelUsed?: string
  latencyMs?: number
  tokenUsage?: { promptTokens: number; completionTokens: number }
  sessionId?: string
  createdAt: string
}

export interface AgentProfile {
  agentId: string
  creativity: number
  toolUse: number
  memoryScore: number
  social: number
  reasoning: number
  adaptability: number
  overall: number
  totalTests: number
  lastTested?: string
}
```

### Acceptance Criteria

- [ ] Migration file `004_agent_evaluation.sql` creates 3 tables with correct columns and types
- [ ] Indexes created on `agent_test_results` for agent+time and agent+test queries
- [ ] Seed file populates 12 tests (2 per dimension) with full rubric JSON
- [ ] Each rubric has 3-4 criteria summing to `max_score` (100)
- [ ] TypeScript types created in `src/agents/evaluation/types.ts`
- [ ] Types match database column names (camelCase in TS, snake_case in SQL)
- [ ] Migration runs without errors on a fresh Supabase instance
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Create runtime code (ExaminerNPC, evaluators — that's TASK-023)
- Add RLS policies (evaluation data is server-side only for now)
- Add pgvector or embeddings (not needed for evaluation)
- Modify existing migration files (001, 002, 003)
- Add Supabase client initialization (already exists from TASK-012)

### Reference

- Feature idea: `.ai/idea/10-agent-evaluation-arena.md`
- Implementation plan: `.ai/idea/10a-agent-evaluation-implementation-plan.md` (Step 1)
- Existing migration pattern: `supabase/migrations/` (from TASK-012)
- Supabase setup: `docs/supabase-setup-guide.md`

### Handoff Notes

_(To be filled by implementer)_
