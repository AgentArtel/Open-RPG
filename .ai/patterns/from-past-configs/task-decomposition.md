# Pattern: Task Decomposition

**Source**: Even-Openclaw
**Category**: Task

## Description

Break sprint goals into single-session-sized task briefs with consistent structure: context, objective, specifications, acceptance criteria, "Do NOT" boundaries, and handoff notes.

## Evidence

Even-Openclaw had 23 task files with strong consistency:
- 86% had acceptance criteria (checkboxes)
- 78% had "Do NOT" sections
- 82% had explicit dependency declarations
- Tasks ranged from simple (TASK-002: fork a repo) to complex (TASK-P4-01: build API client)

**Well-structured example** (TASK-P4-01):
- Clear context explaining what exists and what's needed
- Specific objective with measurable outcome
- Detailed specifications with code examples
- 8 acceptance criteria as checkboxes
- Explicit "Do NOT" section listing 4 boundaries
- Handoff notes section for the implementing agent

**Poorly-structured example** (TASK-P3-03):
- 4 specifications in one task (port remapping, migration, frontend change, backend function)
- Ended in PARTIAL status — some items completed, others deferred
- Should have been split into 2-3 smaller tasks

## When to Use

- Every task in every sprint — this is the standard format
- Use `.ai/templates/task.md` as the starting template

## How to Apply

1. **One task = one session**: If it takes more than one focused session, split it
2. **Max 4-5 specs**: If you have more, split into subtasks
3. **Required fields**:
   - Status, Assigned, Priority, Type, Depends on, Blocks
   - Context (what exists, why this task exists)
   - Objective (specific, measurable)
   - Specifications (step-by-step, with code examples where helpful)
   - Acceptance Criteria (checkboxes, each independently verifiable)
   - Do NOT (explicit out-of-scope boundaries)
   - Handoff Notes (updated by the implementing agent)
4. **Include "Required Reading"** for tasks touching unfamiliar code (see TASK-003)
5. **Use phase-scoped IDs**: TASK-P1-01, TASK-P2-03 (easy to track which phase)
6. **Validate before assignment**: Check all criteria are testable, dependencies are acyclic

## Variations

- **Escalation tasks**: For critical regressions, use a different format focused on: problem statement, what's been tried, files to investigate, success criteria (see TASK-ESCALATE-CHAT-REGRESSION)
- **Lovable tasks**: For UI-only work, acceptance criteria focus on visual outcomes and build passing
- **Research tasks**: For investigation, the deliverable is a report file, not code changes

