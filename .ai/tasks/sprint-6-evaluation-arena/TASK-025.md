## TASK-025: Performance-Driven Task Assignment

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 7 (Agent Evaluation Arena)
- **Type**: Modify
- **Depends on**: TASK-024 (profiles must exist to read)
- **Blocks**: None (enhancement, not blocking)

### Context

With agent profiles tracking capability scores (TASK-024), this task connects those
profiles to the task assignment system. Agent YAML configs gain `requires` thresholds
per task, and the AgentManager reads profiles to determine which tasks each agent
qualifies for. Additionally, each agent's system prompt is enriched with their
capability self-awareness — telling them what they're good at.

This creates a feedback loop: agents are tested → profiles are built → tasks are
assigned based on strengths → agents naturally develop expertise in their strong areas.

### Objective

Wire agent profiles into AgentManager so tasks are assigned based on capability
thresholds, and agents receive self-awareness about their strengths in their system
prompt.

### Specifications

**Modify:** Agent YAML config schema

Add optional `requires` blocks to task definitions in agent YAML configs:

```yaml
# In src/config/agents/photographer-clara.yaml (example):
tasks:
  - name: "create_portrait"
    description: "Take artistic portraits of players"
    requires:
      creativity: 70
      tool_use: 60
      social: 50
  - name: "describe_scene"
    description: "Describe the current environment poetically"
    requires:
      creativity: 60
  - name: "guard_patrol"
    description: "Patrol the village perimeter"
    requires:
      reasoning: 50
      adaptability: 60
```

Tasks without `requires` are always available (backwards compatible).

**Modify:** `src/agents/core/AgentManager.ts`

Add profile-aware task filtering during agent initialization or periodic refresh:

```typescript
// After loading agent config and creating AgentRunner:
const profile = await this.profileManager.getProfile(agentId)

if (profile && config.tasks) {
  const assignable = config.tasks.filter(task => {
    if (!task.requires) return true  // no requirements = always available
    return Object.entries(task.requires).every(([dimension, minScore]) =>
      (profile[dimension as keyof AgentProfile] as number) >= minScore
    )
  })
  agent.assignedTasks = assignable
} else {
  // No profile yet or no tasks defined — assign all tasks
  agent.assignedTasks = config.tasks ?? []
}
```

**Modify:** System prompt builder (in AgentRunner or system prompt construction)

Inject a "Your Capabilities" section when a profile exists:

```typescript
function buildCapabilitiesSection(profile: AgentProfile): string {
  const dimensions = [
    { key: 'creativity', label: 'Creativity' },
    { key: 'toolUse', label: 'Tool Use' },
    { key: 'memoryScore', label: 'Memory' },
    { key: 'social', label: 'Social' },
    { key: 'reasoning', label: 'Reasoning' },
    { key: 'adaptability', label: 'Adaptability' },
  ]

  const sorted = dimensions
    .map(d => ({ ...d, score: Math.round(profile[d.key] as number) }))
    .sort((a, b) => b.score - a.score)

  const strengths = sorted.filter(d => d.score >= 70)
  const developing = sorted.filter(d => d.score >= 40 && d.score < 70)

  let section = '\n## Your Capabilities\n'
  if (strengths.length > 0) {
    section += 'Based on your experience, you excel at:\n'
    section += strengths.map(s => `- ${s.label} (${s.score}/100)`).join('\n')
    section += '\n'
  }
  if (developing.length > 0) {
    section += "You're developing:\n"
    section += developing.map(d => `- ${d.label} (${d.score}/100)`).join('\n')
    section += '\n'
  }
  return section
}
```

This goes into the system prompt between personality and perception, so the NPC
has meta-awareness of their strengths and naturally gravitates toward behaviors
they're "good at."

**Prompt architecture (after this task):**

```
[System Prompt]
1. Personality (from YAML)
2. Your Capabilities (from profile — NEW)
3. Current Perception (snapshot)
4. Your Memories (recalled content — TASK-020)
5. Recent Conversation (from AgentMemory)
6. Rules / Instructions
```

**AgentManager dependency:**

AgentManager needs access to ProfileManager. Inject via constructor:

```typescript
class AgentManager {
  constructor(
    private supabase: SupabaseClient,
    private profileManager?: ProfileManager  // optional — graceful when not available
  ) {}
}
```

Optional dependency so the system works without evaluation being set up.

### Acceptance Criteria

- [ ] Agent YAML configs support optional `requires` blocks on tasks
- [ ] AgentManager filters tasks based on profile scores vs requirements
- [ ] Tasks without `requires` are always assigned (backwards compatible)
- [ ] Agents without profiles get all tasks assigned (graceful fallback)
- [ ] System prompt includes "Your Capabilities" section when profile exists
- [ ] Capabilities sorted: strengths (>=70) listed first, then developing (>=40)
- [ ] No capabilities section when profile is null (clean degradation)
- [ ] ProfileManager is an optional dependency on AgentManager
- [ ] Existing agent configs continue to work unchanged
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Build the evaluation UI or trigger mechanism (TASK-026)
- Change the profile calculation logic (TASK-024)
- Add task reassignment based on real-time performance changes (future enhancement)
- Make ProfileManager a required dependency (must degrade gracefully)
- Auto-run evaluations — that's a manual/scheduled action
- Add weighted dimension priorities per agent (equal weights for MVP)

### Reference

- Feature idea: `.ai/idea/10-agent-evaluation-arena.md`
- Implementation plan: `.ai/idea/10a-agent-evaluation-implementation-plan.md` (Step 4)
- AgentManager: `src/agents/core/AgentManager.ts`
- ProfileManager: `src/agents/evaluation/ProfileManager.ts` (TASK-024)
- Agent YAML configs: `src/config/agents/`
- System prompt construction: `src/agents/core/AgentRunner.ts`

### Handoff Notes

_(To be filled by implementer)_
