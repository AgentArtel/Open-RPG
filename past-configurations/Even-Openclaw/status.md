# Sprint Status

Last updated: 2026-02-09

## ⚠️ Open escalation (Claude Code)

**Chat regression:** Connection and agent response were working; chat no longer works. User believes the fix is in a **prior frontend commit**.

- **Task:** `.ai/tasks/TASK-ESCALATE-CHAT-REGRESSION.md`
- **Assignee:** claude-code
- **Ask:** Compare frontend Chat + gateway/eveng1 hooks to earlier commits (e.g. 050e05e, 8aed7e8 and history of `Chat.tsx`, `use-openclaw-chat.ts`, `use-gateway-api.ts`, `use-gateway-connection.ts`); find what changed and restore working chat while keeping current gateway contract (idempotencyKey, no agentId).

---

## Current Sprint: Phase 4 complete — next TBD

**Phase 1 Proof of Concept:** COMPLETE (all 12 tasks done)  
**Phase 2 Frontend + Phased Agent Foundation:** COMPLETE  
**Phase 3 Real Data:** NEARLY COMPLETE (P3-01 ✅, P3-02 ✅, P3-03 partial)  
**Phase 4 OpenClaw Gateway:** COMPLETE (P4-01–P4-04 done, 050e05e, 8aed7e8)

### Phase 4 — Dashboard ↔ OpenClaw Gateway

| # | ID | Title | Assigned | Priority | Status | Depends |
|---|-----|-------|----------|----------|--------|---------|
| 1 | TASK-P4-01 | Build OpenClaw Gateway API client hook | cursor | P0 | **DONE** | none |
| 2 | TASK-P4-02 | Wire agent creation to OpenClaw | cursor | P0 | **DONE** | P4-01 |
| 3 | TASK-P4-03 | Wire skill creation & attachment to OpenClaw | cursor | P0 | **DONE** | P4-01, P4-02 |
| 4 | TASK-P4-04 | Build real-time streaming chat via gateway | cursor | P0 | **DONE** | P4-01, P4-02 |

### What Phase 4 delivers
- **P4-01:** Full gateway API client — typed request/response methods for agents, skills, chat, config
- **P4-02:** Agent CRUD syncs to OpenClaw (Supabase ↔ OpenClaw dual-write)
- **P4-03:** Skills write to agent workspaces as SKILL.md files (OpenClaw's native format)
- **P4-04:** Streaming chat via `chat.send` — real-time word-by-word responses, session history

### End Goal
Create an agent → attach skills → chat with it → see streaming responses. All from the dashboard.

### Phased Agent Foundation (steps 1–8) — DONE

| Step | What | Status | Commit |
|------|------|--------|--------|
| 1 | Migration: `channel_id`, `openclaw_agent_id` on agents | ✅ | 293b523 |
| 2 | Agent Management: channel dropdown, OpenClaw ID, one per channel | ✅ | 293b523 |
| 3 | Eveng1 plugin: Supabase client, agent resolver, ensure in OpenClaw | ✅ | 293b523 |
| 4 | Migration: `agent_skills` table + data migration | ✅ | 293b523 |
| 5 | Agent Management: add/remove skills via `agent_skills` | ✅ | 293b523 |
| 6 | Plugin: load skills for resolved agent, pass to dispatch | ✅ | 293b523 |
| 7 | Workforces + routing_rules migrations, Workforces page, hooks | ✅ | 293b523 |
| 8 | Chat "Chat with" selector, `user_settings` chat target columns | ✅ | 293b523 |
| — | Audit follow-ups: real routing rules, port comment, drop skills migration, use-agents from agent_skills | ✅ | 86bb753 |
| — | Supabase casts in hooks, migration order docs, TASK-LOVABLE-001 | ✅ | 848c018 |
| — | Merge Claude Code: P3 task briefs, routing rules UI (DISABLED badge, pattern, targetType) | ✅ | 50dece2 |

### Phase 3 Task Queue

| # | ID | Title | Assigned | Priority | Status | Depends |
|---|-----|-------|----------|----------|--------|---------|
| 1 | TASK-P3-01 | Run Supabase migrations & regenerate types | Lovable | P0 | **DONE** | — |
| 2 | TASK-P3-02 | Replace all mock data with real Supabase hooks | Cursor | P0 | **DONE** (d120c2b) | P3-01 ✅ |
| 3 | TASK-P3-03 | Wire remaining integration gaps | Cursor | P1 | **PARTIAL** | P3-01 ✅ |

**P3-01 (Lovable)** — DONE. All 5 migrations run; build fixed with `(supabase as any)` casts. Optional: regenerate `types.ts` and remove casts.

**P3-02 (Cursor)** — DONE (d120c2b). Deleted `mock-data.ts`; LiveMonitor/Dashboard/ComputeTiers/AgentStudio use real hooks or placeholders; duplicate `useRoutingRules` fixed in AgentManagement.

**P3-03 (Cursor)** — PARTIAL. Done: port remapping documented (eveng1-channel), drop `agents.skills` migration added and run, `use-agents` derives skills from `agent_skills`, agent cards use skills. Remaining: backend `resolveAgentForUser()` to read `current_chat_agent_id` from user_settings (optional).

### Lovable Task (one-off)

| ID | Title | Status |
|----|-------|--------|
| TASK-LOVABLE-001 | Review updates, run 5 migrations, verify build | **DONE** (Lovable ran migrations, fixed build) |

Claude Code: Deep dive OpenClaw codebase, Phase 4 architecture, task briefs P4-01–P4-04, P3-01–P3-03; audited Cursor commits (293b523, 86bb753, 848c018, d120c2b, 050e05e). **DONE.**

Task briefs: `.ai/tasks/`  
Full plan: `docs/FEATURE-PHASED-AGENT-MANAGEMENT.md`

## Source Code & Design References

| Resource | Location | Status |
|----------|----------|--------|
| OpenClaw | `ai-agent-backend/openclaw/` | Cloned (submodule, AgentArtel fork) |
| EvenDemoApp | `glasses-apps/EvenDemoApp/` | Cloned (submodule, AgentArtel fork) |
| EH-InNovel | `glasses-apps/EH-InNovel/` | Cloned (submodule, read-only) |
| Lovable Dashboard | `frontend-lovable/clawlens-companion/` | Phased foundation complete; Workforces, Chat selector, agent_skills, routing rules |
| Kimi K2 Reference | `frontend-lovable/v2-replace-v1/` | Design reference (read-only) |

## Recently Completed

| ID / Ref | Title | Agent | Date |
|----------|-------|-------|------|
| ESCALATE-CHAT | fix: chat.send missing idempotencyKey + sending invalid agentId param | claude-code | 2026-02-09 |
| 8aed7e8 | fix: remove dead sessionKey ternary in Chat (per Claude audit) | cursor | 2026-02-09 |
| 050e05e | Phase 4: OpenClaw Gateway Integration (P4-01–P4-04) | cursor | 2026-02-09 |
| d120c2b | P3-02: Replace mock data with real Supabase/placeholders, delete mock-data.ts | cursor | 2026-02-09 |
| 8161ddb | Phase 4 architecture — OpenClaw gateway integration plan, P4-01–P4-04 briefs | claude-code | 2026-02-09 |
| 50dece2 | Merge Claude Code: P3 task briefs, routing rules UI (DISABLED, pattern, targetType) | cursor | 2026-02-09 |
| 848c018 | Supabase casts in hooks, migration order docs, TASK-LOVABLE-001 | cursor | 2026-02-09 |
| 86bb753 | Audit follow-ups: real routing rules, port comment, drop agents.skills, use-agents from agent_skills | cursor | 2026-02-09 |
| 293b523 | Phased Agent Foundation Plan (steps 1–8): migrations, eveng1 Supabase, agent_skills, workforces, Chat selector | cursor | 2026-02-09 |
| TASK-LOVABLE-001 | Run 5 migrations, fix build (Lovable report) | lovable | 2026-02-09 |
| P3-01 | Run Supabase migrations (5 run by Lovable) | lovable | 2026-02-09 |
| P3-03 (partial) | Port doc, drop skills migration, use-agents skills from agent_skills | cursor | 2026-02-09 |
| 8221668 | Replace hardcoded routing rules, add P3-01/02/03 task briefs | claude-code | 2026-02-09 |
| TASK-P2-04 … P2-10 | use-user-settings, gateway, eveng1 hooks; Settings; Chat; real status | cursor | 2026-02-09 |
| 2cf4e54 | Add phased agent management plan (docs) | claude-code | 2026-02-09 |
| TASK-001 … TASK-012 | Phase 1 proof of concept (submodules, plugin, Flutter bridge, pipeline, schema, hooks, Lovable SQL) | various | 2026-02-07–08 |

## Dependency Graph

```
Phase 1 ✅ → Phase 2 (Cursor: hooks, Settings, Chat) ✅
  → Phased Agent Foundation (steps 1–8) ✅
  → Audit follow-ups + Lovable migrations (P3-01) ✅
  → P3-02 ✅ (d120c2b) → P3-03 PARTIAL
  → Phase 4: P4-01 ✅ → P4-02 ✅ → P4-03 ✅ → P4-04 ✅ (050e05e, 8aed7e8)
```

## OpenClaw Gateway API Surface (reference)

**Port 18789** — WebSocket JSON-RPC

| Method | Scope | Purpose |
|--------|-------|---------|
| `agents.list` | read | List all runtime agents |
| `agents.create` | admin | Create agent with workspace |
| `agents.update` | admin | Update agent name/model |
| `agents.delete` | admin | Remove agent |
| `agents.files.get/set` | admin | Read/write agent files (SKILL.md, SOUL.md) |
| `chat.send` | write | Send message, stream response. **Required**: `sessionKey`, `idempotencyKey`. Optional: `message`, `thinking`. No `agentId` (derived from sessionKey). |
| `chat.history` | read | Get chat transcript |
| `chat.abort` | write | Cancel running response |
| `skills.status` | read | List available skills |
| `skills.install` | admin | Install a skill |
| `skills.update` | admin | Enable/disable/configure skills |
| `config.get` | read | Read config (redacted) |
| `config.patch` | admin | Merge partial config |
| `models.list` | read | List available LLM models |
| `sessions.list` | read | List chat sessions |

Auth: `{ token: "..." }` in connect frame. Scopes: `operator.read`, `operator.write`, `operator.admin`.

## Notes

- **Phase 1 COMPLETE** — All 12 tasks done; end-to-end pipeline working.
- **Phase 2 + Phased Agent Foundation COMPLETE** — Steps 1–8 in `293b523`; audit follow-ups in `86bb753`, `848c018`; Lovable ran all 5 migrations and fixed build.
- **P3-01 DONE** — Migrations run; types regeneration optional.
- **P3-02 DONE** — Mock data removed; real hooks/placeholders in LiveMonitor, Dashboard, ComputeTiers, AgentStudio; mock-data.ts deleted (commit d120c2b).
- **P3-03** — Mostly done; optional: backend `resolveAgentForUser()` for Chat "Chat with" override (see TASK-P3-03).
- **Phase 4:** Two-tier agent system — Supabase = metadata/UI, OpenClaw = runtime. Linked via `openclaw_agent_id`. Skills sync via `agents.files.set` (SKILL.md). Streaming chat via gateway `chat.send`. eveng1 channel (glasses) preserved on port 3377; dashboard uses gateway port 18789.
- **Submodule forks** — All point to AgentArtel forks.
