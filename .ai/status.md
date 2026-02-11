# Sprint Status

Last updated: 2026-02-11

## Current Phase

**Phase 3: Core Implementation** — Phase 0/1 complete. RPGJS scaffolded, dev
server verified, TypeScript interfaces defined, test NPC working, LLM
integration validated (Moonshot/Kimi K2). Plugin analysis complete — using
@rpgjs/default-gui, @rpgjs/plugin-emotion-bubbles, @rpgjs/gamepad. All
research and architecture work done. Ready for core agent system implementation.

## Current Sprint — Core Agent System (Phase 3)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-006 | Build PerceptionEngine | cursor | P0-Critical | PENDING |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | P0-Critical | PENDING |
| TASK-008 | Build AgentRunner (core LLM loop) | cursor | P0-Critical | PENDING |

Implementation order: TASK-006 → TASK-007 → TASK-008 (008 depends on both 006 and 007)

## Previous Sprint — Phase 0: Environment Setup (ALL DONE)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | P0-Critical | DONE |
| TASK-002 | Verify RPGJS dev server runs | cursor | P0-Critical | DONE |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | P0-Critical | DONE |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | P1-High | DONE |
| TASK-005 | LLM Integration Feasibility Test | cursor | P0-Critical | DONE |

## Backlog

| Phase | Title | Agent | Priority |
|-------|-------|-------|----------|
| Phase 3 | Build AgentMemory | cursor | P1 |
| Phase 3 | Build AgentManager | cursor | P1 |
| Phase 4 | Build GameChannelAdapter (bridge) | cursor | P0 |
| Phase 4 | RPGJS Module Integration (NPC speech bubble GUI) | cursor | P0 |
| Phase 5 | End-to-end integration testing | cursor | P0 |
| Phase 5 | Agent personality configuration | cursor | P1 |
| Phase 5 | Save/load player state (@rpgjs/save) | cursor | P2 |
| Phase 6 | Architecture documentation | claude-code | P2 |

## Recently Completed

| ID | Title | Agent | Date |
|----|-------|-------|------|
| — | RPGJS plugin analysis (use vs build) | claude-code | 2026-02-11 |
| — | Prior art analysis (Stanford, AI Town, Voyager) | claude-code | 2026-02-11 |
| — | Updated architecture to Kimi K2/K2.5 + Railway + Lovable | claude-code | 2026-02-11 |
| — | Updated boundaries for Kimi Overseer ownership | claude-code | 2026-02-11 |
| TASK-005 | LLM Integration Feasibility Test (openai + Moonshot API) | cursor | 2026-02-10 |
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | 2026-02-10 |
| TASK-002 | Verify RPGJS dev server runs | cursor | 2026-02-10 |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | 2026-02-10 |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | 2026-02-10 |
| — | Open Artel multi-agent system setup (Kimi, git hooks, skills) | cursor | 2026-02-10 |
| — | Project structure and multi-agent setup | claude-code | 2026-02-09 |
| — | Dev toolkit created (guide, Cursor rules, corrected structure) | claude-code | 2026-02-09 |
| — | OpenClaw reference + patterns extraction guide | claude-code | 2026-02-09 |

## Architecture Notes

- **LLM Provider**: Moonshot Kimi K2 (idle) + K2.5 (conversation) via `openai` SDK.
  NOT using Anthropic or OpenAI yet — may add later via Vercel AI SDK.
- **Deployment**: Railway (RPGJS game server) + Lovable (frontend iframe embed).
- **Structure**: Flat `main/` directory matching RPGJS v4 autoload conventions.
- **Plugins (3 active)**: `@rpgjs/default-gui` (dialogue, choices, notifications),
  `@rpgjs/plugin-emotion-bubbles` (30+ emotions for NPC expressions),
  `@rpgjs/gamepad` (controller support). See `docs/rpgjs-plugin-analysis.md`.
- **Key API discovery**: `RpgEvent extends RpgPlayer` — NPCs inherit ALL player
  methods: `showEmotionBubble()`, `showText()`, `showAnimation()`, Components API.
- **Custom builds needed**: Non-blocking NPC speech bubble (sprite-attached GUI,
  Phase 4), thinking indicator (`EmotionBubble.ThreeDot`, Phase 4).
- **Prior art**: Stanford Generative Agents, AI Town, Voyager analyzed with
  ADOPT/ADAPT/SKIP guide at `docs/prior-art-analysis.md`.
- **Multi-agent ops**: Kimi Overseer reviews commits via GitHub Actions.
  Commit routing headers: `[AGENT:x] [ACTION:y] [TASK:z]`.

## Research Documents (for Cursor to review before implementing)

- `docs/rpgjs-plugin-analysis.md` — Plugin use/skip/build decisions with code examples
- `docs/prior-art-analysis.md` — Stanford/AI Town/Voyager patterns and how we adapt them
- `docs/rpgjs-guide.md` — RPGJS v4 API cheat sheet
- `docs/openclaw-patterns.md` — 6 extracted patterns with our adaptations

## Recent Reviews

| Task | Agent | Verdict | Date | Review File |
|------|-------|---------|------|-------------|
| TASK-006/007/008 | cursor | **REJECTED** | 2026-02-10 | `.ai/reviews/TASK-006-007-008-review.md` |

**Rejection reason:** Severe boundary violations (modified `.ai/**` and `docs/**` files belonging to Claude Code). No implementation code submitted for any task. All acceptance criteria remain UNMET.

## Open Issues

See `.ai/issues/active-issues.md` for full details.
- **NEW:** Agent boundary clarification needed — Cursor attempted to modify Claude Code's domain files
