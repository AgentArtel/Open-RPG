# Sprint Status

Last updated: 2026-02-14

## Current Phase

**Sprints 0–4 COMPLETE. Sprint 5 ready to begin.** All foundation built: agent core, skills,
perception, memory, Supabase persistence (agent + player), GUI polish (speech bubbles, conversation
log), Railway deploy config. TASK-013 (player state persistence) finalized. Cursor has completed
Sprint 5 research and dependency analysis. Next: Sprint 5 implementation (API-as-Identity + Social).

## Sprint Overview

Tasks organized by sprint. See `.ai/tasks/README.md` for full index with links.

| Sprint | Phase | Focus | Tasks | Status |
|--------|-------|-------|-------|--------|
| [Sprint 0](tasks/sprint-0-environment/) | 0 | Environment setup | 001–005 | DONE |
| [Sprint 1](tasks/sprint-1-core-agent/) | 3–4 | Core agent system | 006–009 | DONE |
| [Sprint 2](tasks/sprint-2-llm-gateway/) | 3.5 | Multi-provider LLM | 010–011 | BACKLOG |
| [Sprint 3](tasks/sprint-3-persistence/) | 5 | Persistence + AgentManager | 012–014 | DONE |
| [Sprint 4](tasks/sprint-4-polish-deploy/) | 5 | Polish + deploy | 015–017 | DONE |
| **[Sprint 5](tasks/sprint-5-api-identity-social/)** | **6** | **API-as-Identity + social** | **018–021** | **NEXT** |
| [Sprint 6](tasks/sprint-6-evaluation-arena/) | 7 | Evaluation arena | 022–026 | BACKLOG |

## Completed Sprint 3 — Persistence + Agent Management

| ID | Title | Agent | Status |
|----|-------|-------|--------|
| TASK-012 | Supabase Agent Memory Persistence | cursor | DONE |
| TASK-013 | Player State Persistence via Supabase | cursor | DONE |
| TASK-014 | Build AgentManager + YAML Config Loader | cursor | DONE |

## Completed Sprint 4 — Polish + Deploy

| ID | Title | Agent | Status |
|----|-------|-------|--------|
| TASK-015 | NPC Speech Bubble GUI | cursor | DONE |
| TASK-016 | Agent Conversation Log GUI | cursor | DONE |
| TASK-017 | Deploy to Railway | cursor | DONE |

## Next — Sprint 5: API-as-Identity + Social

| ID | Title | Agent | Status |
|----|-------|-------|--------|
| TASK-018 | Photographer NPC (API-as-Identity) | cursor | PENDING |
| TASK-019 | Content Store + tagging | cursor | PENDING |
| TASK-020 | Associative recall + social feed | cursor | PENDING |
| TASK-021 | Lovable feed integration | lovable | PENDING |

**Recommended order**: 018 → 019 → then 020 (cursor) + 021 (lovable) in parallel.
Cursor Sprint 5 research plan: `.cursor/plans/sprint_5_research_and_plan_abbdc987.plan.md`.

## Unscheduled Backlog

| Title | Agent | Priority |
|-------|-------|----------|
| End-to-end integration testing | cursor | P0 |
| Agent personality configuration + diverse sprites | cursor | P1 |
| LLM Gateway refactor → Agent Artel Studio (see note below) | cursor | P1 |
| Builder dashboard polish | cursor | P2 |
| Session recorder / NPC jobs | cursor | P2 |
| Fragment Quest System (past/future, starter choice) | cursor | P2 |
| Architecture documentation | claude-code | P2 |

**Sprint 2 (LLM Gateway) — deferred to Agent Artel Studio:** The current hardcoded `LLMClient` (Moonshot-only) works fine for now. When Agent Artel Studio is ready, refactor into a provider-agnostic `LLMGateway` with provider registry, tier-based routing (idle/conversation/reasoning/reflection), and fallback chains — managed through the Studio UI rather than YAML config. TASK-010/011 briefs remain as reference for the gateway architecture. Sprint 2 stays BACKLOG until Studio is available.

## Recently Completed

| ID | Title | Agent | Date |
|----|-------|-------|------|
| TASK-013 | Player State Persistence via Supabase | cursor | 2026-02-14 |
| — | Sprint 5 research and implementation plan | cursor | 2026-02-14 |
| — | Repo README rewrite (quickstart, architecture, troubleshooting) | cursor | 2026-02-14 |
| TASK-015-017 | Sprint 4: speech bubbles, conversation log, Railway deploy | cursor | 2026-02-13 |
| — | Sprint 4 audit — all three tasks PASS | claude-code | 2026-02-13 |
| — | Kimi approved Sprint 4 (TASK-015-017) | kimi | 2026-02-13 |
| — | Complete system narrative: layer-by-layer integration story (idea 13) | claude-code | 2026-02-13 |
| — | Unified system synthesis: gap analysis + 6 fresh proposals (idea 12) | claude-code | 2026-02-13 |
| — | Reorganize tasks folder into sprint-based structure | claude-code | 2026-02-13 |
| — | Context/Rendering/SharedDB idea doc (idea 11) | claude-code | 2026-02-13 |
| — | Agent Evaluation Arena impl plan + TASK-022/023/024/025/026 briefs | claude-code | 2026-02-13 |
| — | Agent Evaluation Arena idea doc (benchmarking + paid service) | claude-code | 2026-02-13 |
| — | NPC Social + Associative Memory + Fragments vision + TASK-019/020/021 briefs | claude-code | 2026-02-13 |
| — | API-as-Identity vision doc + TASK-018 brief (Photographer NPC) | claude-code | 2026-02-13 |
| — | Task briefs for TASK-015/016/017 (speech bubble, conv log, Railway) | claude-code | 2026-02-12 |
| TASK-014 | AgentManager + YAML config + AgentNpcEvent + builder dashboard | cursor | 2026-02-12 |
| TASK-012 | Supabase Agent Memory Persistence | cursor | 2026-02-12 |
| — | AgentManager task brief (TASK-014) + sprint planning | claude-code | 2026-02-12 |
| — | Supabase persistence feature design (idea + plan + TASK-012/013) | claude-code | 2026-02-12 |
| — | Multi-provider LLM gateway feature design (idea + plan + TASK-010/011) | claude-code | 2026-02-12 |
| TASK-009 | Build GameChannelAdapter (bridge) + dialogue fix | cursor | 2026-02-11 |
| TASK-008 | Build AgentRunner (core LLM loop) + live test NPC | cursor | 2026-02-11 |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | 2026-02-11 |
| TASK-006 | Build PerceptionEngine | cursor | 2026-02-11 |
| — | RPGJS plugin analysis (use vs build) | claude-code | 2026-02-11 |
| — | Prior art analysis (Stanford, AI Town, Voyager) | claude-code | 2026-02-11 |
| TASK-005 | LLM Integration Feasibility Test | cursor | 2026-02-10 |
| TASK-001-004 | Scaffold + interfaces + test NPC | cursor | 2026-02-10 |

## Known Behavior

- **Multiple onAction enqueues**: Rapid action key presses enqueue separate tasks. Serialized per-agent; not a bug.
- **All AI NPCs share 'female' graphic**: Only 2 spritesheets available. See Issue #12.

## Architecture Notes

- **LLM Provider**: Moonshot Kimi K2 (idle) + K2.5 (conversation) via `openai` SDK.
- **Database**: Supabase (hosted Postgres + pgvector). `@supabase/supabase-js` SDK.
  Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Agent Management**: `AgentManager` singleton loads YAML from `src/config/agents/`.
  `AgentNpcEvent` is the generic RpgEvent for all AI NPCs. `spawnContext` passes
  config to events since `createDynamicEvent()` has no constructor args.
- **Deployment**: Railway (RPGJS game server) + Lovable (frontend iframe embed).
- **Structure**: Flat `main/` directory matching RPGJS v4 autoload conventions.
- **Plugins**: `@rpgjs/default-gui`, `@rpgjs/plugin-emotion-bubbles`, `@rpgjs/gamepad`.
- **GUI**: Builder dashboard prototype (`main/gui/builder-dashboard.vue`) with Tailwind CSS.
  Opens via 'B' key input. Can place AI NPCs and scripted NPCs at arbitrary positions.
- **Prior art**: Stanford Generative Agents, AI Town, Voyager.
  See `docs/prior-art-analysis.md`.

## Research Documents

- `docs/rpgjs-plugin-analysis.md` — Plugin use/skip/build decisions
- `docs/prior-art-analysis.md` — Stanford/AI Town/Voyager patterns
- `docs/rpgjs-guide.md` — RPGJS v4 API cheat sheet
- `docs/openclaw-patterns.md` — 6 extracted patterns with our adaptations
- `docs/supabase-setup-guide.md` — Supabase project setup instructions
- `.ai/idea/05-multi-provider-llm-gateway.md` — Multi-provider LLM gateway
- `.ai/idea/06-supabase-persistence.md` — Supabase persistence
- `.ai/idea/07-session-recorder-workflow-npc-jobs.md` — Session recorder / NPC jobs (Cursor)
- `.ai/idea/08-api-as-identity-npcs.md` — API-as-Identity NPC vision (token economy, four-stage progression)
- `.ai/idea/08a-api-powered-skills-implementation-plan.md` — DALL-E skill + Photographer NPC impl plan
- `.ai/idea/09-npc-social-memory-fragments.md` — NPC social feed, associative recall, fragment quests
- `.ai/idea/09a-social-memory-fragments-implementation-plan.md` — ContentStore + tagging + recall + feed impl plan
- `.ai/idea/10-agent-evaluation-arena.md` — Agent benchmarking, performance tracking, paid evaluation service
- `.ai/idea/10a-agent-evaluation-implementation-plan.md` — Evaluation schema, examiner NPC, profiles, task assignment, dashboard
- `.ai/idea/11-context-rendering-shared-db.md` — Context=lifespan, time=rendering, shared Supabase
- `.ai/idea/12-unified-system-synthesis.md` — Gap analysis, lifecycle loop, 6 fresh ideas
- `.ai/idea/13-complete-system-narrative.md` — Complete system: layers, data architecture, NPC prompt anatomy
- `.ai/idea/plugins/` — 10 plugin ideas (Cursor): builder-dashboard, quest-log, day-night-cycle, etc.

## Recent Reviews

| Task | Agent | Verdict | Date | Review File |
|------|-------|---------|------|-------------|
| TASK-015-017 | cursor | **APPROVED** | 2026-02-13 | `.ai/reviews/TASK-015-016-017-review.md` |
| TASK-012+014 | cursor | **APPROVED** | 2026-02-12 | `.ai/reviews/TASK-012-014-review.md` |
| TASK-001-009 | cursor | **APPROVED** | 2026-02-12 | `.ai/reviews/001-009-review.md` |
| TASK-008 | cursor | **APPROVED** | 2026-02-11 | `.ai/reviews/008-review.md` |

**TASK-013 Review (2026-02-14):** Orchestrator audit: PlayerStateManager correctly implements save/load/delete with Supabase upsert, graceful null-client no-op, never-throw error handling. Migration 002 creates `player_state` table with auto-updating trigger. `main/player.ts` loads state in `onConnected` (with map restore), saves fire-and-forget in `onDisconnected`. All acceptance criteria met.

**TASK-015–017 Approval (2026-02-13):** Orchestrator audit (commit 4b32195): all three tasks PASS. TASK-015: npc-bubble.vue, say skill mode/defaultSpeechMode, content policy — correct. TASK-016: conversation-log.vue, getConversationsForPlayer, L keybind — correct; note: assistant messages not per-player (MVP acceptable). TASK-017: /health, railway.toml, Dockerfile, package.json start — correct. No fixes required.

**TASK-012+014 Approval (2026-02-12):** SupabaseAgentMemory implements IAgentMemory with write-behind buffer, correct error handling, graceful fallback. AgentManager implements IAgentManager with YAML loading, skill wiring, bridge registration via spawnContext pattern. Clever solution for `createDynamicEvent` limitation. Builder dashboard bonus. Minor notes: player.ts still has scripted NPC spawn config alongside AgentManager (acceptable hybrid). Tasks organized in `.ai/tasks/` by sprint folder.

## Open Issues

See `.ai/issues/active-issues.md` for issues #1-#12.
