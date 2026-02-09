## TASK-002: Verify RPGJS dev server and document project structure

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 0
- **Type**: Create
- **Depends on**: TASK-001
- **Blocks**: TASK-003

### Context

After scaffolding the RPGJS starter (TASK-001), we need to verify everything
works correctly and understand the generated project structure. This maps to
Phase 0.2 in the project outline.

### Objective

Confirmed working RPGJS dev environment with the project structure documented
and understood. The generated structure should be mapped to our agent ownership
boundaries.

### Specifications

- Run `rpgjs dev` and verify the game loads in browser
- Run `rpgjs build` and verify production build succeeds
- Run `npx tsc --noEmit` and note any type issues
- Review the generated project structure
- Update `.ai/boundaries.md` if the scaffold created files not yet mapped

### Acceptance Criteria

- [ ] `rpgjs dev` starts the dev server without errors
- [ ] `rpgjs build` produces a clean production build
- [ ] Game loads in browser — player can walk around
- [ ] `.ai/boundaries.md` reflects any new files from the scaffold

### Do NOT

- Start building the agent system
- Modify the game logic beyond verification
- Change root config files without orchestrator approval

### Reference Documents

- `idea/03-project-outline.md` — Phase 0
- `idea/02-research-outline.md` — Phase 1.1 (RPGJS server architecture)

### Handoff Notes

[Updated by the assigned agent when status changes]
