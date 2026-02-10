## TASK-001: Scaffold RPGJS v4 project from sample2

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 0
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-002, TASK-003, TASK-004

### Context

We are in Phase 0 (Environment Setup). The multi-agent coordination files are
in place. RPGJS v4.3.1 source is cloned at `docs/rpgjs-reference/` as a local
reference. We need the base game framework before any development can begin.

### Objective

A running RPGJS v4 game where `rpgjs dev` launches a dev server with a playable
map, walkable player character, and at least one NPC visible on screen.

### Approach: Use sample2 as the base

Instead of scaffolding from the minimal starter, copy from the RPGJS sample2
project which already has maps, tilesets, NPCs, items, and spritesheets.

**Source**: `docs/rpgjs-reference/packages/sample2/`

**Steps**:
1. Copy `docs/rpgjs-reference/packages/sample2/main/` → project root `main/`
2. Copy `docs/rpgjs-reference/packages/sample2/rpg.toml` → project root
3. Copy `docs/rpgjs-reference/packages/sample2/tsconfig.json` → project root
4. Copy `docs/rpgjs-reference/packages/sample2/index.html` → project root
5. Create `package.json` based on sample2 but cleaned up:
   - Remove web3, react (we'll use Vue for GUI per RPGJS default)
   - Keep: `@rpgjs/client`, `@rpgjs/server`, `@rpgjs/compiler`, `@rpgjs/common`,
     `@rpgjs/database`, `@rpgjs/default-gui`, `@rpgjs/gamepad`, `@rpgjs/standalone`
   - Add: `@anthropic-ai/sdk`
   - Pin to `^4.3.0` for RPGJS packages
6. Run `npm install`
7. Run `rpgjs dev` to verify it works
8. Remove the `plugin/` directory (not needed for MVP)
9. Clean up any sample2-specific code (e.g., test GUI)
10. Preserve all coordination files: AGENTS.md, CLAUDE.md, .ai/, .cursor/, docs/, idea/

### Acceptance Criteria

- [ ] `rpgjs dev` starts without errors
- [ ] Browser connects to the game server at localhost:3000
- [ ] Player character appears on a map and can move
- [ ] At least one NPC is visible on the map
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Coordination files intact (AGENTS.md, CLAUDE.md, .ai/, .cursor/, docs/, idea/)
- [ ] `@anthropic-ai/sdk` is in package.json dependencies
- [ ] Project follows RPGJS v4 autoload structure (flat `main/` directory)

### Do NOT

- Modify AGENTS.md, CLAUDE.md, .ai/, .cursor/rules/, docs/, idea/
- Delete `docs/rpgjs-reference/` — it's our local reference
- Add agent system code — that comes in later phases
- Use the old `src/modules/main/server/` structure — use flat `main/` autoload

### Reference

- RPGJS guide: `docs/rpgjs-guide.md`
- Sample2 source: `docs/rpgjs-reference/packages/sample2/`
- Autoload docs: `docs/rpgjs-reference/docs/guide/autoload.md`
- Project outline: `idea/03-project-outline.md` — Phase 0

### Handoff Notes

[Updated by the assigned agent when status changes]
