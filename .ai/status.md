# Sprint Status

Last updated: 2026-02-09

## Current Phase

**Phase 0: Environment Setup** — Project structure corrected to match RPGJS v4
autoload conventions. RPGJS v4.3.1 source cloned as local reference. Dev toolkit
created (guide, Cursor rules, boundaries). Ready to scaffold from sample2.

## Current Sprint

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | P0-Critical | PENDING |
| TASK-002 | Verify RPGJS dev server runs | cursor | P0-Critical | PENDING |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | P0-Critical | PENDING |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | P1-High | PENDING |

## Backlog (from Project Outline)

| Phase | Title | Agent | Priority |
|-------|-------|-------|----------|
| Phase 1 | RPGJS deep dive — build NPC cheat sheet | cursor | P0 |
| Phase 1 | OpenClaw pattern extraction — document adopted patterns | cursor | P0 |
| Phase 1 | Integration feasibility — test LLM call from RPGJS process | cursor | P0 |
| Phase 2 | Write Architecture Decision Records (ADRs) | claude-code | P0 |
| Phase 2 | Define all TypeScript interfaces | cursor | P0 |
| Phase 2 | Document data flow diagrams | claude-code | P1 |
| Phase 3 | Build PerceptionEngine | cursor | P0 |
| Phase 3 | Build Skill System (5 MVP skills) | cursor | P0 |
| Phase 3 | Build AgentRunner (core LLM loop) | cursor | P0 |
| Phase 3 | Build AgentMemory | cursor | P1 |
| Phase 3 | Build AgentManager | cursor | P1 |
| Phase 4 | Build GameChannelAdapter (bridge) | cursor | P0 |
| Phase 4 | RPGJS Module Integration | cursor | P0 |
| Phase 5 | End-to-end integration testing | cursor | P0 |
| Phase 5 | Agent personality configuration | cursor | P1 |
| Phase 6 | Architecture documentation | claude-code | P2 |

## Recently Completed

| ID | Title | Agent | Date |
|----|-------|-------|------|
| — | Project structure and multi-agent setup | claude-code | 2026-02-09 |
| — | RPGJS v4.3.1 reference cloned to docs/ | claude-code | 2026-02-09 |
| — | Dev toolkit created (guide, Cursor rules, corrected structure) | claude-code | 2026-02-09 |
| — | Project structure corrected to v4 autoload conventions | claude-code | 2026-02-09 |

## Architecture Notes

- **Structure change**: Moved from `src/modules/main/server/` + `src/modules/main/client/`
  to flat `main/` directory matching RPGJS v4 autoload conventions. The old nested
  structure would not trigger autoload discovery.
- **Starter choice**: Using sample2 from RPGJS repo instead of minimal starter —
  comes with maps, tilesets, NPCs, items, spritesheets, sounds already working.
- **RPGJS reference**: Full v4.3.1 source at `docs/rpgjs-reference/` — read-only.
