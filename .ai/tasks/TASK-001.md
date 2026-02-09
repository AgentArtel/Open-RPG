## TASK-001: Scaffold RPGJS v4 starter project

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 0
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-002, TASK-003, TASK-004

### Context

We are in Phase 0 (Environment Setup) of the project outline. The multi-agent
coordination files are in place, but there is no RPGJS project scaffolded yet.
We need the base game framework before any development can begin.

### Objective

A running RPGJS v4 starter project where `rpgjs dev` launches a dev server
and a player can connect via browser and walk around a default map.

### Specifications

- Scaffold RPGJS v4 using `npx degit rpgjs/starter` or equivalent
- Preserve existing files: AGENTS.md, CLAUDE.md, .cursor/, .ai/, idea/, docs/
- Install dependencies: `npm install`
- Add `@anthropic-ai/sdk` as a dependency
- Verify the dev server starts and a player can connect

### Acceptance Criteria

- [ ] `rpgjs dev` starts without errors
- [ ] Browser connects to the game server
- [ ] Player character appears and can move on the default map
- [ ] Existing coordination files (AGENTS.md, CLAUDE.md, .ai/, .cursor/) are intact
- [ ] `@anthropic-ai/sdk` is in package.json dependencies

### Do NOT

- Modify AGENTS.md, CLAUDE.md, .ai/, .cursor/rules/, docs/, idea/
- Add any agent system code yet — this is purely environment setup
- Configure the agent system — that comes in later phases

### Reference Documents

- `idea/03-project-outline.md` — Phase 0: Environment Setup
- RPGJS docs: https://docs.rpgjs.dev

### Handoff Notes

[Updated by the assigned agent when status changes]
