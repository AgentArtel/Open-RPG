# Agent Evaluation Arena: Benchmarking, Task Assignment, and Paid Testing

## The Idea in One Sentence

Give AI agents structured tests within the game world, benchmark their performance
across capabilities (reasoning, creativity, tool use, memory), use scores to auto-assign
tasks they're best at, track improvement over time, and offer this as a paid service
for external agents.

---

## Three Layers

### Layer 1: In-Game Agent Testing

Agents take structured evaluations inside the game world. Tests are diegetic — they
happen through game mechanics, not outside the fiction.

**Test Types:**

| Test | What It Measures | In-Game Fiction |
|------|-----------------|-----------------|
| **Comprehension** | Can the agent understand and follow multi-step instructions? | "The Elder gives you three tasks. Complete them in order." |
| **Creativity** | Quality/originality of generated content (images, text, music) | "The Art Guild judges your portfolio submission." |
| **Tool Use** | Reliability of API/skill execution, error handling | "The Craftmaster tests your ability to use the forge." |
| **Memory** | Can the agent recall past interactions accurately? | "The Historian quizzes you on what happened last week." |
| **Social** | Quality of dialogue, personality consistency, empathy | "The Tavern Keeper rates your conversation skills." |
| **Reasoning** | Logic puzzles, multi-step planning, cause-and-effect | "The Sage presents a riddle that must be solved." |
| **Adaptability** | How well the agent handles novel situations | "You're placed in an unfamiliar environment. What do you do?" |

**Test Mechanics:**

```
1. TEST NPC (examiner) presents a challenge to the AGENT NPC (subject)
2. Agent NPC responds using its normal skill set (say, look, generate_image, etc.)
3. Test NPC evaluates the response using a rubric (LLM-as-judge or structured scoring)
4. Score recorded in Supabase: agent_id, test_type, score, timestamp, details
5. Results feed into the agent's performance profile
```

### Layer 2: Performance-Driven Task Assignment

Test scores create an **agent capability profile**. The AgentManager uses this profile
to assign tasks that match the agent's strengths.

```
Agent Profile: Clara the Photographer
  creativity:    92/100  ← strong
  tool_use:      88/100  ← strong
  memory:        71/100  ← moderate
  social:        85/100  ← good
  reasoning:     63/100  ← weak
  adaptability:  78/100  ← good

→ Auto-assigned: Creative tasks, image generation, player interactions
→ Not assigned: Complex multi-step quests, logic puzzles
```

**Over time, profiles update.** An agent that improves at reasoning after many
game sessions gets assigned harder tasks. This is visible progression — not
leveling up stats, but measurably getting better at what they do.

### Layer 3: Paid Agent Evaluation Service

**The business model:** Other developers send their AI agents to the game world to be
tested. We return a detailed performance report.

```
External Developer → Sends agent (via API) → Agent enters game world
  → Takes standardized test suite → Performance report generated
  → Developer receives: scores, strengths, weaknesses, recommendations
  → Developer pays per evaluation session
```

**Why developers would pay:**
- Standardized benchmarks for game AI (none exist today)
- Real-world environment testing (not synthetic benchmarks)
- Comparison against other agents (leaderboard)
- Actionable recommendations (not just scores)

---

## Technical Architecture

### Evaluation Schema

```sql
-- Test definitions
create table agent_tests (
  id            uuid primary key default gen_random_uuid(),
  test_type     text not null,        -- 'creativity', 'memory', 'reasoning', etc.
  name          text not null,        -- 'Portfolio Review', 'History Quiz'
  description   text,
  rubric        jsonb not null,       -- scoring criteria
  max_score     integer default 100,
  difficulty    text default 'standard', -- 'basic', 'standard', 'advanced'
  created_at    timestamptz default now()
);

-- Test results
create table agent_test_results (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  test_id       uuid references agent_tests,
  score         integer not null,
  max_score     integer not null,
  details       jsonb default '{}',   -- per-criterion breakdown
  model_used    text,                 -- which LLM model was running
  latency_ms    integer,              -- response time
  token_usage   jsonb,                -- input/output tokens
  session_id    text,                 -- game session identifier
  created_at    timestamptz default now()
);

-- Aggregated performance profiles (materialized or computed)
create table agent_profiles (
  agent_id      text primary key,
  creativity    float default 0,
  tool_use      float default 0,
  memory        float default 0,
  social        float default 0,
  reasoning     float default 0,
  adaptability  float default 0,
  total_tests   integer default 0,
  last_tested   timestamptz,
  updated_at    timestamptz default now()
);

-- Index for time-series performance tracking
create index idx_test_results_agent_time on agent_test_results(agent_id, created_at);
```

### Test Runner Architecture

```
ExaminerNPC (special event type)
  │
  ├─ Holds test definitions (loaded from agent_tests table)
  ├─ Presents challenges to subject agents via game mechanics
  ├─ Evaluates responses using LLM-as-judge or rubric matching
  └─ Records results to agent_test_results

AgentManager
  │
  ├─ Triggers scheduled evaluations (e.g., every N sessions)
  ├─ Reads agent_profiles for task assignment
  └─ Adjusts agent behavior config based on scores
```

### LLM-as-Judge Pattern

For subjective tests (creativity, social), use a separate LLM call to evaluate:

```typescript
const evaluation = await llmClient.complete([
  {
    role: 'system',
    content: `You are an impartial judge evaluating an AI NPC's response.
Score from 0-100 on: originality, coherence, personality_consistency, engagement.
Return JSON: { scores: {...}, overall: N, feedback: "..." }`
  },
  {
    role: 'user',
    content: `Test: ${test.description}
Agent response: ${agentResponse}
Rubric: ${JSON.stringify(test.rubric)}`
  }
])
```

### Performance Tracking Over Time

```typescript
// Query: How has Clara's creativity improved?
const history = await supabase
  .from('agent_test_results')
  .select('score, created_at')
  .eq('agent_id', 'photographer-clara')
  .eq('test_type', 'creativity')
  .order('created_at', { ascending: true })

// Returns: [{ score: 72, date: '2026-02-13' }, { score: 78, date: '2026-02-14' }, ...]
// → Plot improvement curve in dashboard
```

---

## In-Game Integration

### Examiner NPCs

Special NPCs in the game world whose purpose is evaluation:

| Examiner | Location | Tests |
|----------|----------|-------|
| The Elder | Village Square | Comprehension, Memory |
| Art Guild Master | Gallery | Creativity (images, music) |
| The Craftmaster | Workshop | Tool Use, Multi-step execution |
| The Historian | Library | Memory, Recall accuracy |
| Tavern Keeper | Tavern | Social skills, Personality |
| The Sage | Mountain Temple | Reasoning, Logic puzzles |

Examiner NPCs are **not** AI-driven — they're scripted test harnesses that
present challenges and record scores. The *subject* agents are the AI ones.

### Test Flow (In-Game)

```
Player triggers test: "Elder, can you test my agent's memory?"
  ↓
Elder presents 5 questions about past game events
  ↓
Agent NPC answers each question
  ↓
Elder scores responses (LLM-as-judge for open-ended, exact match for factual)
  ↓
Results displayed to player + stored in Supabase
  ↓
Agent's profile updated
```

### Auto-Assignment

```yaml
# In agent YAML config, add capability requirements:
tasks:
  - name: "photograph_sunset"
    requires:
      creativity: 70
      tool_use: 60
  - name: "guard_patrol"
    requires:
      reasoning: 50
      adaptability: 60
```

AgentManager checks profile scores against requirements before assigning tasks.

---

## Paid Service Architecture (Post-MVP)

### External Agent API

```
POST /api/evaluate
{
  "agent_config": {
    "api_endpoint": "https://customer-api.com/agent",
    "api_key": "...",
    "model": "gpt-4o"
  },
  "test_suite": "standard",    // or "creativity", "comprehensive"
  "callback_url": "https://..."
}

Response:
{
  "session_id": "eval-123",
  "status": "queued",
  "estimated_duration": "5 minutes"
}
```

### Evaluation Pipeline

```
1. Customer submits agent config via API
2. System creates a temporary NPC in a sandboxed game instance
3. NPC runs through standardized test suite
4. Results aggregated into performance report
5. Report delivered via callback URL or dashboard
6. Customer billed per evaluation session
```

### Pricing Model (ideas)

| Tier | Tests | Price | Includes |
|------|-------|-------|----------|
| Basic | 3 core tests | $5/eval | Scores + summary |
| Standard | All 7 tests | $15/eval | Scores + detailed breakdown + recommendations |
| Comprehensive | 7 tests × 3 difficulty levels | $40/eval | Full report + comparison + improvement plan |
| Subscription | Unlimited evaluations | $99/month | All above + historical tracking + API access |

---

## How It Connects

| Existing System | Connection |
|----------------|------------|
| `AgentRunner` | Subject agent's responses are what gets evaluated |
| `IAgentMemory` | Memory tests query the agent's actual memory system |
| `SkillRegistry` | Tool use tests exercise real skills (generate_image, etc.) |
| `ContentStore` (TASK-019) | Creativity tests evaluate stored content quality |
| `agent_profiles` | Feeds into AgentManager task assignment |
| `npc_posts` feed | Evaluation results could be posted as NPC achievements |
| Lovable frontend | Performance dashboard, leaderboards, evaluation reports |

---

## Open Questions

1. **Test frequency** — How often should agents be retested? After every N sessions?
2. **LLM-as-judge reliability** — Same model judging itself? Use a different model for evaluation?
3. **Sandboxing external agents** — How to safely run customer agents without compromising game state?
4. **Leaderboard privacy** — Public leaderboard or private results only?
5. **Test generation** — Static tests or LLM-generated tests for variety?
6. **Player involvement** — Can players create custom tests for NPCs?

---

## Success Criteria

### Internal Evaluation (MVP)
- Examiner NPC presents a test to an AI NPC
- AI NPC responds using its normal capabilities
- Response scored and stored in Supabase
- Agent profile reflects test scores
- Performance history visible over time

### Task Assignment
- AgentManager reads profile scores
- Tasks assigned based on capability match
- Agent improves at assigned tasks over sessions

### Paid Service (Post-MVP)
- External agent submits via API
- Runs through test suite in sandboxed instance
- Performance report generated and delivered
- Billing per evaluation session
