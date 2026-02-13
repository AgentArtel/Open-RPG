# Kimi Agent Swarm Guide

## What Is Agent Swarm?

Agent Swarm is the capability of Kimi K2.5 to create and dispatch **many subagents in parallel** within a single session. It is not a separate mode or feature to enable — it is an inherent capability of the K2.5 model.

When the Kimi Overseer needs to perform multiple independent tasks simultaneously, it can:

1. Create multiple dynamic subagents via `CreateSubagent`
2. Dispatch tasks to all of them in a single turn via multiple `Task` calls
3. Collect results as each subagent completes

This is called "swarming" because the overseer acts as a coordinator dispatching a swarm of specialized workers.

## K2.5 Limits

| Limit | Value |
|-------|-------|
| Maximum sub-agents per session | 100 |
| Maximum tool calls per session | 1,500 |
| Context window | 256K tokens |
| Model | `moonshot-ai/kimi-k2.5` (configured in `~/.kimi/config.toml`) |

**Important**: These are per-session limits. Archiving a session and starting a new one resets the counters. Use `scripts/kimi-session-manager.sh` to manage session lifecycle.

## When to Use Parallel Subagents

### Use Parallel Dispatch When

- Tasks are **independent** — no task depends on another's output
- Tasks are **similar in scope** — each takes roughly the same time
- Results can be **aggregated** after all complete
- You need to **maximize throughput** (e.g., sprint-end reviews)

### Use Sequential Dispatch When

- Tasks have **dependencies** — Task B needs Task A's output
- Tasks are **exploratory** — the next step depends on what you find
- Context is **shared** — later tasks need earlier context
- You need **careful reasoning** — complex decisions benefit from step-by-step

## Two-Step Workflow

Every dynamic subagent follows the same two-step pattern:

```python
# Step 1: Create the subagent with a system prompt
CreateSubagent(
    name="reviewer-TASK-101",
    system_prompt="You are a code reviewer. Check acceptance criteria..."
)

# Step 2: Dispatch a task to the subagent
Task(
    subagent_name="reviewer-TASK-101",
    prompt="Review the submission for TASK-101. Check .ai/tasks/TASK-101.md..."
)
```

For parallel dispatch, the overseer issues multiple `Task` calls in a single response:

```python
# Create all subagents first
CreateSubagent(name="reviewer-TASK-101", system_prompt="...")
CreateSubagent(name="reviewer-TASK-102", system_prompt="...")
CreateSubagent(name="reviewer-TASK-103", system_prompt="...")

# Then dispatch all tasks (Kimi can issue these in parallel)
Task(subagent_name="reviewer-TASK-101", prompt="Review TASK-101...")
Task(subagent_name="reviewer-TASK-102", prompt="Review TASK-102...")
Task(subagent_name="reviewer-TASK-103", prompt="Review TASK-103...")
```

## Available Patterns

Documented patterns for common swarm use cases:

| Pattern | File | Use Case |
|---------|------|----------|
| **Parallel Review** | `.ai/patterns/agent-swarm-parallel-review.md` | Review multiple tasks simultaneously at sprint end |
| **Research Split** | `.ai/patterns/agent-swarm-research-split.md` | Decompose a large research task across multiple researchers |

## Best Practices

### 1. Task Decomposition

Break work into truly independent units. If Task B reads a file that Task A writes, they are not independent — run them sequentially.

### 2. Naming Conventions

Include the task ID and a descriptive prefix in subagent names:

```
reviewer-TASK-101
researcher-api-docs
perf-analyzer-TASK-205
doc-writer-readme
```

### 3. Result Aggregation

Each subagent should write its output to a specific file. The overseer then reads all output files to produce a summary:

```
.ai/reviews/TASK-101-review.md  (from reviewer-TASK-101)
.ai/reviews/TASK-102-review.md  (from reviewer-TASK-102)
.ai/reviews/TASK-103-review.md  (from reviewer-TASK-103)
```

### 4. Context Isolation

Subagents run in isolated contexts — they cannot see each other's work. This is a feature, not a limitation:

- Prevents cross-contamination between reviews
- Each subagent starts with a clean context
- No risk of one subagent's error affecting another

### 5. Monitor Tool Call Budget

With 1,500 tool calls per session, plan your budget:

- A typical review uses ~10-20 tool calls (ReadFile, Grep, Think, WriteFile)
- A swarm of 10 reviewers uses ~100-200 tool calls
- Leave headroom for the overseer's own operations

Use `scripts/kimi-context-monitor.sh check` to monitor session health.

### 6. Combine with Session Management

For large swarm operations:

1. Create a dedicated session: `./scripts/kimi-session-manager.sh create swarm-sprint-review`
2. Run the swarm
3. Archive when done: `./scripts/kimi-session-manager.sh archive swarm-sprint-review`

This keeps swarm context separate from regular development sessions.

## Troubleshooting

### Subagent Limit Reached

If you hit the 100-subagent limit, archive the session and start a new one. Subagents are session-scoped and cannot be reused across sessions.

### Tool Call Budget Exhausted

If you approach 1,500 tool calls, the overseer should:

1. Compact the session: `/compact`
2. Or archive and create a new session
3. Continue remaining tasks in the new session

### Subagent Produces Empty Output

Ensure the `Task` prompt specifies:

- What to analyze (file paths, git diff, etc.)
- What to produce (report format, output file path)
- Where to save it (specific `.ai/` path)

### Slow Parallel Execution

Parallel subagents share the same API rate limits. If many subagents make API calls simultaneously, some may be rate-limited. This is normal — Kimi handles retries internally.

