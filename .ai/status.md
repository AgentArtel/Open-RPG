# Sprint Status

Last updated: 2026-02-13

## Current Phase

**Phase 5: Polish + Deployment prep.** Core agent system, bridge, Supabase persistence,
and AgentManager all complete. YAML-driven NPCs spawn automatically. Builder dashboard
prototype added. Next priorities: player state persistence, deployment to Railway, or
NPC speech bubble GUI.

## Active Sprint — Player Persistence

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-013 | Player State Persistence via Supabase | cursor | P2-Medium | IN PROGRESS |

## Completed Sprint — Persistence + AgentManager (ALL DONE)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-012 | Supabase Agent Memory Persistence | cursor | P1-High | DONE |
| TASK-014 | Build AgentManager + YAML Config Loader | cursor | P1-High | DONE |

TASK-012: `SupabaseAgentMemory` with write-behind buffer, graceful fallback, `createAgentMemory()` factory.
TASK-014: `AgentManager` loads YAML configs, wires subsystems, spawns via `AgentNpcEvent` + `spawnContext` pattern. Builder dashboard bonus (`spawnAgentAt()`).

## Previous Sprint — Core Agent System (ALL DONE)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-009 | Build GameChannelAdapter (bridge) | cursor | P0-Critical | DONE |
| TASK-006 | Build PerceptionEngine | cursor | P0-Critical | DONE |
| TASK-007 | Build Skill System (5 MVP skills) | cursor | P0-Critical | DONE |
| TASK-008 | Build AgentRunner (core LLM loop) | cursor | P0-Critical | DONE |

## Phase 0: Environment Setup (ALL DONE)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-001 | Scaffold RPGJS v4 project from sample2 | cursor | P0-Critical | DONE |
| TASK-002 | Verify RPGJS dev server runs | cursor | P0-Critical | DONE |
| TASK-003 | Define TypeScript interfaces for all integration points | cursor | P0-Critical | DONE |
| TASK-004 | Build test NPC with patrol route and player interaction | cursor | P1-High | DONE |
| TASK-005 | LLM Integration Feasibility Test | cursor | P0-Critical | DONE |

## Next Sprint — Polish + Deploy (queued after TASK-013)

| ID | Title | Agent | Priority | Status |
|----|-------|-------|----------|--------|
| TASK-015 | NPC Speech Bubble GUI | cursor | P0-Critical | PENDING |
| TASK-016 | Agent Conversation Log GUI | cursor | P1-High | PENDING |
| TASK-017 | Deploy to Railway | cursor | P0-Critical | PENDING |

**Recommended order**: TASK-015 → TASK-016 → TASK-017 (deploy with all GUI polish in place).

TASK-015: Floating speech bubbles above NPC sprites (`rpgAttachToSprite`). Three-tier speech: modal for action-key, bubble for proximity/idle. Replaces blocking `showText()` for ambient interactions.
TASK-016: Side panel ('L' key) showing per-NPC conversation history. Reads from existing `IAgentMemory`. Filter by NPC, timestamps, scrollable.
TASK-017: Railway deployment. Health check endpoint, `railway.toml`, Dockerfile HEALTHCHECK, CORS prep. Human prerequisite: create Railway project + set env vars.

## Backlog

| ID | Phase | Title | Agent | Priority |
|----|-------|-------|-------|----------|
| TASK-018 | Phase 6 | Photographer NPC + Image Generation Skill (API-as-Identity Stage 2) | cursor | P1 |
| TASK-019 | Phase 6 | NPC Content Store + Semantic Tagging + Social Posts | cursor | P1 |
| TASK-020 | Phase 6 | Associative Recall + Environment-Driven Memory | cursor | P1 |
| TASK-021 | Phase 6 | Lovable Feed UI + Instagram Bridge | lovable | P2 |
| TASK-010 | Phase 3.5 | Multi-Provider LLM Gateway | cursor | P1 |
| TASK-011 | Phase 3.5 | GitHub Copilot CLI Provider Adapter | cursor | P2 |
| — | Phase 5 | End-to-end integration testing | cursor | P0 |
| — | Phase 5 | Agent personality configuration + diverse sprites | cursor | P1 |
| — | Phase 5 | Builder dashboard polish (Cursor started in gui-design) | cursor | P2 |
| — | Phase 5 | Session recorder / NPC jobs (Cursor idea doc) | cursor | P2 |
| — | Phase 6+ | Fragment Quest System (past/future fragments, starter choice) | cursor | P2 |
| — | Phase 6 | Architecture documentation | claude-code | P2 |

## Recently Completed

| ID | Title | Agent | Date |
|----|-------|-------|------|
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
- `.ai/idea/plugins/` — 10 plugin ideas (Cursor): builder-dashboard, quest-log, day-night-cycle, etc.

## Recent Reviews

| Task | Agent | Verdict | Date | Review File |
|------|-------|---------|------|-------------|
| TASK-012+014 | cursor | **APPROVED** | 2026-02-12 | (this review) |
| TASK-001-009 | cursor | **APPROVED** | 2026-02-12 | `.ai/reviews/001-009-review.md` |
| TASK-008 | cursor | **APPROVED** | 2026-02-11 | `.ai/reviews/008-review.md` |

**TASK-012+014 Approval (2026-02-12):** SupabaseAgentMemory implements IAgentMemory with write-behind buffer, correct error handling, graceful fallback. AgentManager implements IAgentManager with YAML loading, skill wiring, bridge registration via spawnContext pattern. Clever solution for `createDynamicEvent` limitation. Builder dashboard bonus. Minor notes: player.ts still has scripted NPC spawn config alongside AgentManager (acceptable hybrid). TASK-001-009 archived to `.ai/tasks/archive/`.

## Open Issues

See `.ai/issues/active-issues.md` for issues #1-#12.
