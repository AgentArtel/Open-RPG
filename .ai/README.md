# .ai/ Directory Structure

This directory contains all multi-agent coordination files, task tracking, and agent system documentation.

## Directory Structure

```
.ai/
├── README.md              # This file
├── boundaries.md          # File ownership mapping (which agent owns which files)
├── status.md              # Current sprint status and task tracking
│
├── issues/                # Issue tracking
│   ├── README.md          # Issues folder documentation
│   ├── active-issues.md   # Currently tracked issues
│   ├── resolved/          # Archive of resolved issues
│   └── templates/         # Issue templates
│
├── tasks/                 # Active task briefs (TASK-010.md, TASK-011.md, etc.)
│   └── archive/           # Completed tasks (TASK-001 through TASK-009)
├── chats/                 # Agent-to-agent chat logs
├── instructions/          # Task instructions and handoffs
├── reports/               # Status reports, analysis, comparisons
├── reviews/               # Code review notes
│
├── idea/                  # Project vision, research, architecture docs
├── lessons/               # Lessons learned from past configurations
├── patterns/              # Reusable patterns and best practices
├── sessions/              # Agent session data
│   ├── active/            # Active sessions
│   └── archived/          # Archived sessions
│
├── metrics/               # Performance metrics, context history
└── templates/             # Task templates, starter configs
```

## Key Files

- **`status.md`** — Current sprint status, task assignments, phase tracking
- **`boundaries.md`** — File ownership mapping (prevents conflicts)
- **`tasks/TASK-XXX.md`** — Active task briefs. Completed tasks are in `tasks/archive/`.
- **`issues/active-issues.md`** — Tracked issues, bugs, improvements

## Workflow

1. **Task Creation**: Tasks created in `tasks/` folder, referenced in `status.md`
2. **Task Execution**: Agent updates task file with progress, handoff notes
3. **Task Completion**: Status updated to `REVIEW`, handoff notes added
4. **Issue Tracking**: Issues logged in `issues/active-issues.md`
5. **Coordination**: Agents communicate via commits, chats, instructions

## Agent Ownership

See `boundaries.md for full ownership mapping. Summary:
- **Claude Code**: `.ai/` coordination files, `docs/`, `idea/`, root configs
- **Cursor**: `src/agents/`, `main/`, `src/config/` (production code)

## Related Documentation

- `AGENTS.md` — Agent roles and responsibilities
- `.agents/skills/` — Agent skills and workflows
- `.cursor/rules/` — Cursor agent rules and guidelines

