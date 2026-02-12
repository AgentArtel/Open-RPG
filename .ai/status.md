# Sprint Status

Last updated: 2026-02-12

## Current Phase

**Phase 4: Bridge Layer — COMPLETE.** GameChannelAdapter and Bridge implemented; AgentRunnerTestNPC refactored to use the bridge (register on init, forward onAction to bridge). Idle ticks and conversation with in-game dialogue verified. Next: AgentManager (P1) or Phase 4.2 (e.g. thinking indicator, non-blocking dialogue).

## Current Sprint — Phase 4 Bridge — DONE

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-009 | Build GameChannelAdapter (bridge) | cursor | P0-Critical | DONE |
| TASK-006 | Build PerceptionEngine | cursor | P0-Critical | DONE |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | P0-Critical | DONE |
| TASK-008 | Build AgentRunner (core LLM loop) | cursor | P0-Critical | DONE |

Phase 4: Bridge + GameChannelAdapter implemented; AgentRunnerTestNPC uses bridge; manual + edge-case tests (bridge); conversation dialogue fix (say fallback) in AgentRunner. Live-tested in game.

## Previous Sprint — Phase 0: Environment Setup (ALL DONE)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | P0-Critical | DONE |
| TASK-002 | Verify RPGJS dev server runs | cursor | P0-Critical | DONE |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | P0-Critical | DONE |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | P1-High | DONE |
| TASK-005 | LLM Integration Feasibility Test | cursor | P0-Critical | DONE |

## Backlog

| ID | Phase | Title | Agent | Priority |
|----|-------|-------|-------|----------|
| TASK-012 | Phase 3 | Supabase Agent Memory Persistence | cursor | P1 |
| TASK-013 | Phase 5 | Player State Persistence via Supabase | cursor | P2 |
| — | Phase 3 | Build AgentManager | cursor | P1 |
| TASK-010 | Phase 3.5 | Multi-Provider LLM Gateway | cursor | P1 |
| TASK-011 | Phase 3.5 | GitHub Copilot CLI Provider Adapter | cursor | P2 |
| — | Phase 4 | RPGJS Module Integration (NPC speech bubble GUI) | cursor | P0 |
| — | Phase 5 | End-to-end integration testing | cursor | P0 |
| — | Phase 5 | Agent personality configuration | cursor | P1 |
| — | Phase 6 | Architecture documentation | claude-code | P2 |

## Recently Completed

| ID | Title | Agent | Date |
|----|-------|-------|------|
| — | Supabase persistence feature design (idea + plan + TASK-012/013) | claude-code | 2026-02-12 |
| — | Multi-provider LLM gateway feature design (idea + plan + TASK-010/011) | claude-code | 2026-02-12 |
| TASK-009 | Build GameChannelAdapter (bridge) + dialogue fix | cursor | 2026-02-11 |
| TASK-008 | Build AgentRunner (core LLM loop) + live test NPC | cursor | 2026-02-11 |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | 2026-02-11 |
| TASK-006 | Build PerceptionEngine | cursor | 2026-02-11 |
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

## Known Behavior (Phase 4 Bridge)

- **Multiple onAction enqueues**: If the player presses the action key several times in quick succession when talking to an AI NPC, each press is enqueued separately. The lane queue processes them one after the other, so the player may see multiple NPC replies in sequence. This is expected (serialized per-agent); not a bug. Optional future improvement: debounce or coalesce rapid action key presses.

## Architecture Notes

- **LLM Provider**: Moonshot Kimi K2 (idle) + K2.5 (conversation) via `openai` SDK.
  NOT using Anthropic or OpenAI yet — may add later via Vercel AI SDK.
- **Database**: Supabase (hosted Postgres + pgvector). Agent memory persistence
  (TASK-012) and player state (TASK-013). `@supabase/supabase-js` SDK.
  Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
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
- `.ai/idea/05-multi-provider-llm-gateway.md` — Multi-provider LLM gateway feature idea
- `.ai/idea/05a-multi-provider-implementation-plan.md` — Implementation plan for TASK-010/011
- `.ai/idea/06-supabase-persistence.md` — Supabase persistence feature idea
- `.ai/idea/06a-supabase-implementation-plan.md` — Implementation plan for TASK-012/013

## Recent Reviews

| Task | Agent | Verdict | Date | Review File |
|------|-------|---------|------|-------------|
| TASK-008 | cursor | **APPROVED** | 2026-02-11 | `.ai/reviews/008-review.md` |
| TASK-006/007/008 | cursor | **REJECTED** | 2026-02-10 | `.ai/reviews/TASK-006-007-008-review.md` |

**TASK-008 Approval:** All 11 acceptance criteria met. AgentRunner, LLMClient, LaneQueue fully implemented. Minor boundary violations in workflow files (task status updates, dependency installation) — acceptable for handoff documentation. Build and typecheck pass. 15 unit tests + live integration test.

**Previous Rejection (2026-02-10):** Severe boundary violations (modified `.ai/**` and `docs/**` files belonging to Claude Code). No implementation code submitted. **RESOLVED** in new submission.

## Open Issues

See `.ai/issues/active-issues.md` for full details.
- **NEW:** Agent boundary clarification needed — Cursor attempted to modify Claude Code's domain files
