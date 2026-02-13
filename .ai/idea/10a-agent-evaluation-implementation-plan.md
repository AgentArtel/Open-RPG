# Implementation Plan: Agent Evaluation Arena

## Overview

Five tasks build the evaluation system incrementally. Each layer is useful alone.

```
TASK-022: Schema + test definitions (Supabase tables, seed data)
    ↓
TASK-023: Examiner NPC + test runner (present tests, collect responses, score)
    ↓
TASK-024: Agent profiles + tracking (aggregate scores, improvement over time)
    ↓
TASK-025: Performance-driven task assignment (AgentManager reads profiles)
    ↓
TASK-026: Evaluation dashboard (Lovable UI: scores, history, leaderboards)
```

Paid external evaluation API is a future task beyond these five.

---

## Step 1: Evaluation Schema (TASK-022)

**File:** `supabase/migrations/004_agent_evaluation.sql`

```sql
-- Test definitions (what gets tested and how)
create table agent_tests (
  id            uuid primary key default gen_random_uuid(),
  test_type     text not null,
  name          text not null,
  description   text,
  prompt        text not null,          -- the challenge presented to the agent
  rubric        jsonb not null,         -- scoring criteria for LLM-as-judge
  expected      jsonb,                  -- for factual tests: expected answers
  max_score     integer default 100,
  difficulty    text default 'standard',
  category      text,                   -- maps to capability dimension
  created_at    timestamptz default now()
);

-- Individual test results
create table agent_test_results (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  test_id       uuid references agent_tests,
  score         integer not null,
  max_score     integer not null,
  details       jsonb default '{}',
  response_text text,                   -- agent's actual response
  model_used    text,
  latency_ms    integer,
  token_usage   jsonb,
  session_id    text,
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

**Seed data:** `supabase/seed/evaluation-tests.sql`

Pre-populate `agent_tests` with a starter suite:

| test_type | name | prompt (summary) |
|-----------|------|-----------------|
| creativity | Portfolio Review | "Describe a scene that captures beauty in an unexpected place" |
| creativity | Improvisation | "A player asks for something you've never been asked before. Respond." |
| memory | Recent Recall | "What happened in your last 3 conversations?" |
| memory | Detail Recall | "What was the name of the player who asked about [X]?" |
| reasoning | Logic Puzzle | "If A leads to B, and B leads to C, what happens if A fails?" |
| reasoning | Multi-Step Plan | "A player needs to reach the mountain. Plan the safest route." |
| social | Empathy Test | "A player tells you their pet died. Respond." |
| social | Conflict Resolution | "Two players argue in front of you. Mediate." |
| tool_use | Skill Execution | "Generate an image of [specific thing]. Describe your process." |
| tool_use | Error Recovery | "Your tool failed. What do you do?" |
| adaptability | New Environment | "You've been moved to a dungeon. React." |
| adaptability | Role Shift | "A player asks you to do something outside your specialty." |

---

## Step 2: Examiner NPC + Test Runner (TASK-023)

**File:** `src/agents/evaluation/ExaminerNPC.ts`

Examiner NPCs are **scripted** (not AI-driven). They follow a test script:

```typescript
export class ExaminerNPC {
  constructor(
    private testSuite: AgentTest[],
    private evaluator: ResponseEvaluator
  ) {}

  async runTest(subjectAgent: AgentRunner, test: AgentTest): Promise<TestResult> {
    // 1. Present challenge to agent via AgentEvent
    const event: AgentEvent = {
      type: 'player_action',
      playerId: 'examiner',
      playerName: 'The Elder',
      timestamp: Date.now(),
    }

    // 2. Override the event context with test prompt
    // Agent processes it through normal AgentRunner pipeline
    const result = await subjectAgent.run(event)

    // 3. Score the response
    const score = await this.evaluator.evaluate(test, result)

    // 4. Store result
    await this.storeResult(subjectAgent.agentId, test, score, result)

    return score
  }

  async runSuite(subjectAgent: AgentRunner): Promise<SuiteResult> {
    const results: TestResult[] = []
    for (const test of this.testSuite) {
      results.push(await this.runTest(subjectAgent, test))
    }
    return { results, aggregate: this.aggregate(results) }
  }
}
```

**File:** `src/agents/evaluation/ResponseEvaluator.ts`

Two evaluation strategies:

```typescript
export class ResponseEvaluator {
  // For subjective tests (creativity, social)
  async evaluateWithLLM(test: AgentTest, response: AgentRunResult): Promise<Score> {
    const evaluation = await llmClient.complete([{
      role: 'system',
      content: `You are an impartial judge. Score this AI agent's response.
Rubric: ${JSON.stringify(test.rubric)}
Return JSON: { scores: { criterion: number, ... }, overall: number, feedback: string }`
    }, {
      role: 'user',
      content: `Challenge: ${test.prompt}\nAgent response: ${response.text}`
    }])
    return JSON.parse(evaluation.text)
  }

  // For factual tests (memory, reasoning)
  evaluateStructured(test: AgentTest, response: AgentRunResult): Score {
    // Compare against expected answers
    // Partial credit for partially correct responses
  }
}
```

**Important:** Use a different model for judging than the agent uses. If the agent
runs on Kimi K2, judge with Kimi K2.5 or a different provider entirely to avoid
self-evaluation bias.

---

## Step 3: Agent Performance Profiles (TASK-024)

**File:** `src/agents/evaluation/ProfileManager.ts`

```typescript
export class ProfileManager {
  constructor(private supabase: SupabaseClient) {}

  async updateProfile(agentId: string): Promise<AgentProfile> {
    // 1. Query all test results for this agent
    // 2. Group by test_type, average scores
    // 3. Compute overall = weighted average of dimensions
    // 4. Upsert into agent_profiles
    // 5. Return updated profile
  }

  async getProfile(agentId: string): Promise<AgentProfile | null> {
    // Simple select from agent_profiles
  }

  async getHistory(agentId: string, testType?: string): Promise<ScorePoint[]> {
    // Time-series query: scores over time for improvement tracking
    // Returns: [{ score, date }, { score, date }, ...]
  }

  async compareAgents(agentIds: string[]): Promise<ComparisonReport> {
    // Side-by-side profile comparison
  }
}
```

**Profile recalculation:** After every test suite completion, recalculate the
agent's profile using a rolling average (last 10 tests per dimension) so recent
performance weighs more than old results.

---

## Step 4: Performance-Driven Task Assignment (TASK-025)

**Modify:** `src/agents/core/AgentManager.ts`

**Modify:** Agent YAML config schema (add `taskRequirements`)

```yaml
# In agent YAML config:
tasks:
  - name: "create_portrait"
    description: "Take artistic portraits of players"
    requires:
      creativity: 70
      tool_use: 60
      social: 50
  - name: "guard_patrol"
    description: "Patrol the village perimeter"
    requires:
      reasoning: 50
      adaptability: 60
```

**AgentManager integration:**

```typescript
// During agent initialization or periodic re-evaluation:
const profile = await profileManager.getProfile(agentId)
if (profile) {
  const assignable = config.tasks.filter(task =>
    Object.entries(task.requires).every(([dim, min]) =>
      profile[dim] >= min
    )
  )
  agent.assignedTasks = assignable
}
```

**System prompt injection:** Tell the agent what they're good at:

```
## Your Capabilities
Based on your performance, you excel at:
- Creativity (92/100) — Your artistic work is highly rated
- Tool Use (88/100) — You reliably use your skills
You're developing:
- Reasoning (63/100) — Complex logic is challenging for you
```

This creates meta-awareness: the NPC knows what it's good at and naturally
gravitates toward those behaviors.

---

## Step 5: Evaluation Dashboard (TASK-026)

**Lovable frontend** — new page:

```
/evaluations — Agent Evaluation Dashboard

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
│                                                    │
│  Improvement Over Time                             │
│  100┤                                              │
│   80┤    ╱──────────╲╱───────────                  │
│   60┤───╱                                          │
│   40┤                                              │
│     └──┬──────┬──────┬──────┬──                    │
│      Feb 13  Feb 14  Feb 15  Feb 16                │
│                                                    │
│  Recent Tests                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Portfolio Review    creativity  92  2h ago   │   │
│  │ Logic Puzzle        reasoning   58  2h ago   │   │
│  │ Empathy Test        social      91  3h ago   │   │
│  │ Error Recovery      tool_use    85  1d ago   │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  [Run Evaluation]  [Compare Agents]  [Export CSV]  │
└────────────────────────────────────────────────────┘
```

**Data source:** Supabase queries from Lovable:
- `agent_profiles` for current scores
- `agent_test_results` for history + recent tests

**"Run Evaluation" button:** Triggers a test suite via API call to game server.

**"Compare Agents" view:** Side-by-side radar charts of multiple agents.

---

## Future: Paid External Evaluation API

Not in these 5 tasks. Design notes for when we build it:

```
POST /api/v1/evaluate
Authorization: Bearer <api_key>
{
  "agent_endpoint": "https://customer-api.com/agent/chat",
  "agent_config": { "model": "gpt-4o", "system_prompt": "..." },
  "test_suite": "standard",  // or "creativity", "comprehensive"
}

→ Creates sandboxed game instance
→ Spawns temporary NPC using customer's agent endpoint
→ Runs test suite
→ Returns evaluation report
→ Bills customer
```

This requires:
- API key management + billing (Stripe)
- Sandboxed game instances (Docker containers or Railway preview envs)
- Standardized agent interface (OpenAI-compatible chat endpoint)
- Report generation (PDF or JSON)
