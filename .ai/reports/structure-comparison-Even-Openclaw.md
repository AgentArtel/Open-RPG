# Project Structure Comparison: Current vs Even-Openclaw

**Generated**: 2026-02-10
**Current Project**: open-rpg
**Past Config**: past-configurations/Even-Openclaw/

---

## Overview

This report compares the current project structure against the Even-Openclaw past configuration. Use it to identify patterns to adopt, adapt, or skip.

---

### Current Project Coordination Layer

| Component | Present |
|-----------|---------|
| Sprint status tracking (`.ai/status.md`) | Yes |
| File ownership map (`.ai/boundaries.md`) | Yes |
| Task briefs directory (`.ai/tasks`) | Yes |
| Templates directory (`.ai/templates`) | Yes |
| Review feedback directory (`.ai/reviews`) | No |
| Reports directory (`.ai/reports`) | Yes |
| Instructions directory (`.ai/instructions`) | No |
| Chat logs directory (`.ai/chats`) | No |
| Session management (`.ai/sessions`) | Yes |
| Metrics tracking (`.ai/metrics`) | Yes |
| Pattern library (`.ai/patterns`) | Yes |
| Lessons learned (`.ai/lessons`) | Yes |
| Agent roles definition (`AGENTS.md`) | Yes |
| Orchestrator config (`CLAUDE.md`) | No |
| Cursor governance rules (`.cursor/rules`) | Yes |
| Kimi agent definitions (`.agents`) | Yes |
| Automation scripts (`scripts`) | Yes |
| Documentation (`docs`) | Yes |
| CI/CD workflows (`.github/workflows`) | Yes |

### Past Config (Even-Openclaw) Coordination Layer

| Component | Present |
|-----------|---------|
| Sprint status tracking (`.ai/status.md`) | Yes |
| File ownership map (`.ai/boundaries.md`) | Yes |
| Task briefs directory (`.ai/tasks`) | Yes |
| Templates directory (`.ai/templates`) | Yes |
| Review feedback directory (`.ai/reviews`) | No |
| Reports directory (`.ai/reports`) | No |
| Instructions directory (`.ai/instructions`) | No |
| Chat logs directory (`.ai/chats`) | No |
| Session management (`.ai/sessions`) | No |
| Metrics tracking (`.ai/metrics`) | No |
| Pattern library (`.ai/patterns`) | No |
| Lessons learned (`.ai/lessons`) | No |
| Agent roles definition (`AGENTS.md`) | No |
| Orchestrator config (`CLAUDE.md`) | No |
| Cursor governance rules (`.cursor/rules`) | No |
| Kimi agent definitions (`.agents`) | No |
| Automation scripts (`scripts`) | No |
| Documentation (`docs`) | No |
| CI/CD workflows (`.github/workflows`) | No |

### Agent Roles Comparison

**Current Project Agents:**

- Claude Code — Orchestrator
- Cursor — Implementation Specialist

**Past Config Agents:**

- Claude Code — Orchestrator
- Cursor — Implementation Specialist
- Lovable — UI/UX Specialist + Supabase Executor
- DO NOT EDIT — Auto-generated / External

### Task Format Comparison

| Aspect | Current Project | Past Config |
|--------|----------------|-------------|
| Task count | 4 | 23 |
| Has task template | yes | yes |
| Tasks with Status field | — | 23/23 |
| Tasks with Assigned field | — | 22/23 |
| Tasks with Priority field | — | 22/23 |
| Tasks with Acceptance Criteria | — | 20/23 |

---

## Similarities

- Both define explicit agent roles and file ownership
- Both use task-based work decomposition in `.ai/tasks/`
- Both track sprint progress in `.ai/status.md`
- Both use Cursor governance rules (`.cursor/rules/`)
- Current project has Kimi agent definitions (evolved from past config)

---

## Differences

- Past config has `lovable-knowledge.md` — current project does not
- Past config has `walkthroughs/` directory with setup guides — current project does not
- Past config has `project-vision/` with architecture docs — consider creating one
- Current project has `.agents/` (Kimi integration) — past config predates this
- Current project has GitHub Actions workflows — past config does not
- Current project has session management — past config does not
- Current project has metrics tracking — past config does not
- Task count differs: current has 4, past had 23

---

## Gaps (Present in Past, Missing in Current)

- **Missing project vision**: Past config had `project-vision/README.md` with architecture diagram. Consider creating one.


---

## Suggested Adaptations

Based on the comparison with Even-Openclaw:

### 1. Study Task Brief Format

The past config has 23 task files. Read 2-3 of them to understand:
- How acceptance criteria are structured
- How dependencies are declared
- What "Do NOT" sections look like
- How handoff notes capture decisions

**Recommended**: Read `past-configurations/Even-Openclaw/tasks/TASK-P4-01.md` (a well-structured task)

### 2. Adopt Phased Approach

Even-Openclaw used a phased approach (P1, P2, P3, P4) that worked well. Consider:
- Phase 1: Foundation / Proof of Concept
- Phase 2: Core features
- Phase 3: Integration / Real data
- Phase 4: Polish / Advanced features

Each phase should be independently shippable and have its own task table in `status.md`.

### 3. Generate Comprehensive Boundaries

Even-Openclaw mapped 50 files to agents. Key principles:
- Map by function (what the code does), not by location (where it lives)
- Include a "DO NOT EDIT" section for auto-generated files
- Every file maps to exactly one agent
- Review and update boundaries when adding new directories

### 4. Prepare Escalation Protocol

Even-Openclaw needed an escalation task for a critical regression. Have a template ready:
- Clear problem statement with reproduction steps
- What has already been tried (prevents re-work)
- Specific files to investigate
- Success criteria for the fix

Read `past-configurations/Even-Openclaw/tasks/TASK-ESCALATE-CHAT-REGRESSION.md` for the format.

