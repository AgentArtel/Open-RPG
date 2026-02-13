## TASK-P4-03: Wire skill creation and attachment to OpenClaw agents

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Modify
- **Depends on**: TASK-P4-01, TASK-P4-02
- **Blocks**: TASK-P4-04

### Context

Skills in OpenClaw are Markdown files (`SKILL.md`) with optional YAML frontmatter, stored in the agent's workspace. The gateway API provides:
- `agents.files.set` — write a file (like SKILL.md) to an agent's workspace
- `agents.files.get` — read an agent's file
- `skills.status` — list available/installed skills
- `skills.update` — enable/disable skills

Currently, skills are stored in Supabase (`skills` table) and linked to agents via `agent_skills`. But OpenClaw doesn't know about them — the skill content never reaches the LLM system prompt.

### Objective

When a user creates a skill in Agent Studio and attaches it to an agent, the skill content is written to OpenClaw as a `SKILL.md` file in the agent's workspace. The agent then uses that skill when processing messages.

### Specifications

#### 1. Skill → OpenClaw File Sync

When a skill is saved in Agent Studio (`handleSave` in `AgentStudio.tsx`):

```typescript
// After saving to Supabase...
// If the skill is attached to an agent, write to OpenClaw
const agentSkillLinks = await getAgentSkillLinks(skill.id);
for (const link of agentSkillLinks) {
  if (link.openclawAgentId) {
    await gatewayApi.agents.files.set({
      agentId: link.openclawAgentId,
      name: `skills/${skill.name}/SKILL.md`,
      content: formatSkillMarkdown(skill),
    });
  }
}
```

#### 2. Skill Markdown Format

Format Supabase skill data into OpenClaw's expected format:

```typescript
function formatSkillMarkdown(skill: Skill): string {
  return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.content}`;
}
```

#### 3. Attach Skill to Agent

When adding a skill to an agent via `useAddAgentSkill()`:

```typescript
// After adding to agent_skills in Supabase...
// Write skill file to OpenClaw agent workspace
const agent = await getAgent(agentId);
if (agent.openclawAgentId) {
  const skill = await getSkill(skillId);
  await gatewayApi.agents.files.set({
    agentId: agent.openclawAgentId,
    name: `skills/${skill.name}/SKILL.md`,
    content: formatSkillMarkdown(skill),
  });
}
```

#### 4. Remove Skill from Agent

When removing a skill from an agent:
```typescript
// Write empty content or delete the skill file
if (agent.openclawAgentId) {
  await gatewayApi.agents.files.set({
    agentId: agent.openclawAgentId,
    name: `skills/${skill.name}/SKILL.md`,
    content: '', // Empty = disabled
  });
}
```

#### 5. Load Skills from OpenClaw

On the agent detail panel, show both Supabase skills and OpenClaw skills:

```typescript
// Get skills from OpenClaw for comparison
const ocSkills = await gatewayApi.skills.status({ agentId: agent.openclawAgentId });
// Show sync status: "Synced" / "Local only" / "OpenClaw only"
```

#### 6. Agent Studio Integration

In `AgentStudio.tsx`:
- After saving a skill, show toast: "Skill saved and synced to OpenClaw"
- Show which agents have this skill attached
- The "TEST" functionality already works via `use-eveng1-channel` — no changes needed there, but consider adding a direct test via `chat.send` to the specific agent

### Acceptance Criteria

- [ ] Saving a skill in Agent Studio writes `SKILL.md` to OpenClaw agent workspace
- [ ] Attaching a skill to an agent syncs the file to OpenClaw
- [ ] Removing a skill from an agent removes/clears the file in OpenClaw
- [ ] Skill content format matches OpenClaw's expected markdown + frontmatter
- [ ] Graceful handling when gateway is offline (Supabase save still works)
- [ ] Build passes

### Do NOT

- Modify the OpenClaw codebase or skill loading logic
- Change the Supabase schema
- Modify `src/components/ui/`
- Add new npm dependencies

### Handoff Notes

_Updated by Cursor when complete._
