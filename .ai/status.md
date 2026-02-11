# Sprint Status

Last updated: 2026-02-11

## Current Phase

**Phase 1: Foundation + Phase 3: Core Implementation** — Phase 0 complete.
RPGJS project scaffolded, dev server verified, TypeScript interfaces defined,
test NPC working. LLM integration validated (Moonshot/Kimi K2 via openai SDK).
Open Artel multi-agent system integrated (Kimi overseer, GitHub Actions, git hooks).
Prior art analysis complete. Ready for core agent system implementation.

## Current Sprint — Core Agent System

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-006 | Build PerceptionEngine | cursor | P0-Critical | PENDING |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | P0-Critical | PENDING |
| TASK-008 | Build AgentRunner (core LLM loop) | cursor | P0-Critical | PENDING |

## Previous Sprint — Phase 0: Environment Setup

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | P0-Critical | DONE |
| TASK-002 | Verify RPGJS dev server runs | cursor | P0-Critical | DONE |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | P0-Critical | DONE |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | P1-High | DONE |
| TASK-005 | LLM Integration Feasibility Test | cursor | P0-Critical | DONE |

## Backlog (from Project Outline)

| Phase | Title | Agent | Priority |
|-------|-------|-------|----------|
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
| — | Prior art analysis (Stanford, AI Town, Voyager) | claude-code | 2026-02-11 |
| — | Updated architecture to Kimi K2/K2.5 as primary LLM | claude-code | 2026-02-11 |
| — | Updated boundaries for Kimi Overseer ownership | claude-code | 2026-02-11 |
| TASK-005 | LLM Integration Feasibility Test (openai + Moonshot API) | cursor | 2026-02-10 |
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | 2026-02-10 |
| TASK-002 | Verify RPGJS dev server runs | cursor | 2026-02-10 |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | 2026-02-10 |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | 2026-02-10 |
| — | Open Artel multi-agent system setup (Kimi, git hooks, skills) | cursor | 2026-02-10 |
| — | GitHub Secrets + workflow environment config | cursor | 2026-02-10 |
| — | Project structure and multi-agent setup | claude-code | 2026-02-09 |
| — | RPGJS v4.3.1 reference cloned to docs/ | claude-code | 2026-02-09 |
| — | Dev toolkit created (guide, Cursor rules, corrected structure) | claude-code | 2026-02-09 |
| — | Project structure corrected to v4 autoload conventions | claude-code | 2026-02-09 |
| — | OpenClaw v2026.2.9 reference cloned to docs/ | claude-code | 2026-02-09 |
| — | OpenClaw patterns extraction guide created | claude-code | 2026-02-09 |
| — | Agent system Cursor rules updated with OpenClaw references | claude-code | 2026-02-09 |

## Architecture Notes

- **LLM Provider**: Moonshot Kimi K2 (idle) + K2.5 (conversation) via `openai` SDK.
  NOT using Anthropic or OpenAI yet — may add later via Vercel AI SDK.
- **Deployment**: Railway (RPGJS game server) + Lovable (frontend iframe embed).
- **Structure**: Flat `main/` directory matching RPGJS v4 autoload conventions.
- **Starter**: sample2 from RPGJS repo (maps, tilesets, NPCs, items, spritesheets, sounds).
- **References**: RPGJS v4.3.1 at `docs/rpgjs-reference/`, OpenClaw v2026.2.9 at
  `docs/openclaw-reference/` — both read-only.
- **Prior art**: Stanford Generative Agents, AI Town, Voyager analyzed with
  ADOPT/ADAPT/SKIP guide at `docs/prior-art-analysis.md`.
- **Multi-agent ops**: Kimi Overseer reviews commits on agent branches via GitHub
  Actions. Commit message routing headers: `[AGENT:x] [ACTION:y] [TASK:z]`.
  New directories: `.agents/`, `scripts/`, `past-configurations/` owned by Kimi.
- **Known issue**: Vite doesn't auto-load `.env` for server-side code — use
  `import 'dotenv/config'` or centralize in `src/config/env.ts` (see Issue #3).

## Open Issues

See `.ai/issues/active-issues.md` for full details:
- **Issue #1**: Commit message routing headers not always used
- **Issue #3**: Vite .env gotcha (resolved with dotenv)
- **Issue #6**: Runtime file tracking workflow (resolved)
- **Issue #7-8**: GitHub Secrets setup documentation
