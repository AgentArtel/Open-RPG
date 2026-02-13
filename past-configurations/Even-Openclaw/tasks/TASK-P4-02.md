## TASK-P4-02: Wire agent creation from dashboard to OpenClaw

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Modify
- **Depends on**: TASK-P4-01
- **Blocks**: TASK-P4-03

### Context

Currently, creating an agent in the dashboard only writes to Supabase. The agent exists in the UI but OpenClaw doesn't know about it — it can't process messages. We need to sync: when you create/update/delete an agent in the dashboard, the change propagates to OpenClaw.

The OpenClaw gateway API provides:
- `agents.create` — creates agent with name + workspace
- `agents.update` — updates agent config
- `agents.delete` — removes agent and optionally deletes files
- `config.patch` — can add agents to the config file

### Objective

When a user creates an agent in the Agent Management page, it exists in both Supabase (metadata) AND OpenClaw (runtime). The `openclaw_agent_id` field links them. Agents can be chatted with immediately after creation.

### Specifications

#### 1. Create Agent Flow

Modify `useCreateAgent()` in `use-agents.ts`:

```typescript
// After creating in Supabase...
// 1. Call OpenClaw agents.create
const ocAgent = await gatewayApi.agents.create({
  name: agent.name,
  workspace: agent.name.toLowerCase().replace(/\s+/g, '-'),
});

// 2. Store the OpenClaw agent ID back in Supabase
await supabase
  .from('agents')
  .update({ openclaw_agent_id: ocAgent.id })
  .eq('id', supabaseAgent.id);
```

**Fallback:** If gateway is offline, create in Supabase only and show a toast: "Agent created locally. Connect to OpenClaw gateway to enable chat."

#### 2. Update Agent Flow

When updating agent name/model in the dashboard, also call `agents.update` on the gateway:

```typescript
if (updates.name && agent.openclawAgentId) {
  await gatewayApi.agents.update({
    agentId: agent.openclawAgentId,
    name: updates.name,
  });
}
```

#### 3. Delete Agent Flow

When deleting an agent, also remove from OpenClaw:

```typescript
if (agent.openclawAgentId) {
  await gatewayApi.agents.delete({
    agentId: agent.openclawAgentId,
    deleteFiles: false, // preserve workspace by default
  });
}
```

#### 4. Sync Status on Dashboard Load

Add a sync check on Agent Management page load:
- Call `agents.list` from gateway
- Compare with Supabase agents that have `openclaw_agent_id` set
- Flag any mismatches (agent in Supabase but not in OpenClaw, or vice versa)
- Show a subtle indicator if an agent is "not synced"

#### 5. Agent Management UI Updates

In `AgentManagement.tsx`:
- Show a connection indicator: green dot if gateway is online, gray if offline
- When creating: show "Creating in OpenClaw..." step
- On the agent detail panel: show "OpenClaw Status" (synced/not synced/offline)
- Channel assignment (`eveng1`) should also call `config.patch` to update bindings

### Acceptance Criteria

- [ ] Creating an agent in dashboard also creates it in OpenClaw (when gateway is online)
- [ ] `openclaw_agent_id` is stored in Supabase after creation
- [ ] Deleting an agent removes it from both Supabase and OpenClaw
- [ ] Updating agent name propagates to OpenClaw
- [ ] Graceful degradation when gateway is offline (Supabase-only creation with warning)
- [ ] No duplicate agents created on retry
- [ ] Build passes

### Do NOT

- Modify the eveng1 channel plugin
- Change the OpenClaw gateway codebase
- Remove existing Supabase CRUD logic — augment it
- Modify `src/components/ui/` (design system)

### Handoff Notes

_Updated by Cursor when complete._
