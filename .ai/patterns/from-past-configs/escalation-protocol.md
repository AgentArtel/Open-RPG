# Pattern: Escalation Protocol

**Source**: Even-Openclaw
**Category**: Process

## Description

When a critical regression or cross-agent issue occurs, create a dedicated escalation task with a specific format that prevents wasted effort by documenting what has already been tried.

## Evidence

Even-Openclaw had one escalation task (TASK-ESCALATE-CHAT-REGRESSION) that demonstrated the pattern:
- Clear problem statement with observable symptoms
- Detailed "What has already been tried" section (5 items) — preventing the assigned agent from re-doing failed approaches
- Specific files to investigate with git commands
- Repo layout context for navigating the codebase
- References to related documentation
- Success criteria focused on observable user outcomes

This format saved significant time because the assigned agent (Claude Code) could skip 5 previously-attempted fixes and focus on the actual root cause.

## When to Use

- A feature that was working has regressed
- A bug spans files owned by multiple agents
- Previous fix attempts have failed
- The issue requires deep investigation across the codebase

## How to Apply

1. **Title**: Use `ESCALATION:` prefix for visibility
2. **Status**: OPEN (not PENDING — this needs immediate attention)
3. **Problem section**: Describe what's broken and what the expected behavior is
4. **What has already been tried**: List every approach that was attempted and failed, with enough detail that the agent won't repeat them
5. **Mission section**: Numbered steps for the assigned agent to follow
6. **Repo layout**: If the project has multiple directories or submodules, explain how to navigate
7. **References**: Link to related docs, task briefs, and commits
8. **Success criteria**: Observable outcomes (e.g., "user can send a message and see a reply")

## Variations

- **Performance escalation**: Focus on metrics (before/after), profiling data, and suspected bottlenecks
- **Integration escalation**: Focus on API contracts, request/response examples, and environment differences
- **Security escalation**: Focus on the vulnerability, affected endpoints, and required patches

