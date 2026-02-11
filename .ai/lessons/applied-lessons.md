# Applied Lessons from Past Configurations

**Project**: Open-RPG (AI NPCs in RPGJS)
**Date**: 2026-02-10
**Source Configs**: Even-Openclaw

---

## Applied Successful Patterns

### 1. Phased Approach

- **Source**: Even-Openclaw (17 phases, 9 completed)
- **Applied**: Project uses phased approach in `.ai/idea/03-project-outline.md` with clear phase boundaries. Each phase is independently shippable.
- **Result**: ✅ Phases provide clear milestones and prevent scope creep.

### 2. Explicit File Ownership

- **Source**: Even-Openclaw (50 files mapped across 4 agents)
- **Applied**: `.ai/boundaries.md` (now `.cursor/rules/05-agent-boundaries.mdc`) maps all files to specific agents (Claude Code vs Cursor).
- **Result**: ✅ Prevents ownership conflicts and clarifies responsibilities.

### 3. Detailed Task Briefs with Acceptance Criteria

- **Source**: Even-Openclaw (86% of tasks had acceptance criteria; 78% had "Do NOT" sections)
- **Applied**: All tasks in `.ai/tasks/` follow the template with checkboxes for acceptance criteria and explicit "Do NOT" boundaries.
- **Result**: ✅ Clear, testable criteria enable independent verification.

### 4. Explicit Dependency Declarations

- **Source**: Even-Openclaw (82% of tasks had explicit dependencies)
- **Applied**: All tasks declare "Depends on" and "Blocks" fields using task IDs (e.g., `TASK-003`).
- **Result**: ✅ Enables parallel work and prevents blocked tasks.

### 5. Handoff Notes in Task Files

- **Source**: Even-Openclaw (82% of tasks had handoff notes)
- **Applied**: All completed tasks include "Handoff Notes" sections documenting files changed, decisions made, and verification steps.
- **Result**: ✅ Primary communication channel between task cycles.

---

## Avoided Failed Patterns

### 1. Escalation Tasks

- **Source**: Even-Openclaw (1 escalation task)
- **Avoided**: Task specs include sufficient context. Tasks that touch multiple agents are split into per-agent subtasks.
- **Result**: ✅ No escalations needed so far.

### 2. Multi-Review Cycles

- **Source**: Even-Openclaw (2 tasks with mixed criteria)
- **Avoided**: Acceptance criteria are specific and testable with exact commands to verify (e.g., `rpgjs build`, `npx tsc --noEmit`).
- **Result**: ✅ All criteria can be verified independently.

### 3. Oversized Tasks

- **Source**: Even-Openclaw (anti-pattern: tasks with >4-5 spec items)
- **Avoided**: Tasks are focused, typically 2-4 specification items, touching 1-3 files.
- **Result**: ✅ Tasks complete in single work sessions.

### 4. Cross-Agent Tasks

- **Source**: Even-Openclaw (anti-pattern: tasks touching files owned by multiple agents)
- **Avoided**: Tasks are scoped to single agent ownership. Cross-cutting work is split into per-agent subtasks.
- **Result**: ✅ Clear ownership prevents conflicts.

---

## Adaptations Made

### 1. RPGJS-Specific Structure

- **Source**: Even-Openclaw used React/Next.js structure
- **Adaptation**: Project uses RPGJS v4 autoload convention (`main/` flat structure) instead of nested server/client directories.
- **Rationale**: RPGJS requires specific directory layout for autoload to work correctly.

### 2. Agent System Integration

- **Source**: Even-Openclaw had separate frontend/backend agents
- **Adaptation**: Single "Implementation Specialist" (Cursor) handles all game code, agent system, and bridge layer. Orchestrator (Claude Code) handles architecture and coordination.
- **Rationale**: RPGJS is a unified framework; agent system is server-side only.

### 3. Kimi Integration

- **Source**: Even-Openclaw had no Kimi integration
- **Adaptation**: Added `.agents/` directory with Kimi overseer and subagent configs for enhanced multi-agent coordination.
- **Rationale**: Open Artel multi-agent setup provides Kimi integration for better orchestration.

---

## Post-Sprint Review

### Sprint 1 Review (TASK-001 through TASK-004)

- **Patterns that helped**:
  - Phased approach kept scope manageable
  - Explicit file ownership prevented conflicts
  - Detailed acceptance criteria enabled independent verification
  - Handoff notes documented NPC creation pattern for reuse

- **Patterns that didn't apply**:
  - Multi-agent file ownership (only 2 agents, clear split)
  - Escalation protocol (not needed yet)

- **New lessons discovered**:
  - RPGJS dynamic event spawning (`map.createDynamicEvent()`) is preferred over map class events for Shared-mode NPCs
  - NPC creation pattern can be templated for rapid iteration (`.cursor/templates/npc-event.template.ts`)
  - HMR race conditions in RPGJS dev server are transient and don't affect fresh starts

---

## Next Steps

- Continue applying phased approach for agent system integration
- Document RPGJS-specific patterns in `.cursor/rules/10-rpgjs-toolkit.mdc`
- Use handoff notes to build pattern library for future NPC creation

