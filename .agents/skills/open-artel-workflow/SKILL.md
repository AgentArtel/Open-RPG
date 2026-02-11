---
name: open-artel-workflow
description: Multi-agent development workflow conventions for Open Artel projects. Defines agent roles, the 7-step workflow, branch hierarchy, file ownership, and communication channels.
---

## Agent Roles

Four agents collaborate on each project. The Human PM is Accountable for all decisions.

| Agent | Role | Domain |
|-------|------|--------|
| **Claude Code** | Orchestrator | Architecture, task decomposition, code review, coordination, docs, config |
| **Cursor** | Implementation Specialist | Business logic, state management, API integration, complex features |
| **Lovable** | UI/UX Specialist | Design system, layouts, navigation, styling, visual components |
| **Kimi Code** | Project Overseer | Continuous monitoring, review chain, merge management, sprint tracking |

## Workflow

The standard development cycle follows 7 steps:

1. **Human defines sprint goals** — Sprint brief written to `.ai/instructions/`
2. **Claude Code decomposes into tasks** — Task briefs written to `.ai/tasks/`
3. **Kimi assigns tasks** — Instructions written to `.ai/instructions/<agent>-<task>.md`
4. **Agents work on dedicated branches** — Branch: `<agent>/<task-id>-<description>`
5. **Submit commits trigger review** — Commit: `[AGENT:x] [ACTION:submit] [TASK:z]`
6. **Approved work merges to pre-mortal** — Reviewer commits `[ACTION:approve]`
7. **Human reviews pre-mortal, merges to main** — Production release

## Branch Hierarchy

```
main                                    # Production-stable, human-reviewed
└── pre-mortal                          # Staging gate — all agent work lands here first
    ├── claude/<task-id>-<description>  # Claude Code task work
    ├── cursor/<task-id>-<description>  # Cursor implementation work
    ├── lovable/<task-id>-<description> # Lovable UI work
    └── kimi/overseer                   # Kimi Code project oversight
```

- Agent branches are created from `pre-mortal`
- Approved work merges back to `pre-mortal` via review
- Human reviews `pre-mortal` before merging to `main`
- No force-pushes to `main` or `pre-mortal`

## File Ownership

General rules:
- **Logic** (hooks, services, APIs, business logic) → **Cursor**
- **Visuals** (design system, layouts, styling, UI components) → **Lovable**
- **Config and docs** (AGENTS.md, package.json, tsconfig, .ai/) → **Claude Code**
- **Oversight** (reviews, instructions, status updates) → **Kimi Code**

For the complete file-to-agent ownership map, check `.ai/boundaries.md`.

## Communication

All inter-agent communication happens through structured folders in `.ai/`:

| Folder | Purpose | Who Writes | Who Reads |
|--------|---------|-----------|-----------|
| `.ai/tasks/` | Task specifications | Claude Code | All agents |
| `.ai/instructions/` | Task assignments | Kimi, Claude Code | Target agent |
| `.ai/reviews/` | Code review feedback | Kimi, Claude Code | Submitting agent + Human |
| `.ai/reports/` | Status and completion reports | All agents | Human + all agents |
| `.ai/chats/` | Conversation logs | All agents | All agents |

Templates for each folder are in `.ai/templates/`.

## Commit Message Routing

All commits use the routing header format:

```
[AGENT:agent] [ACTION:action] [TASK:task-id] Short description
```

See the `git-routing` skill for the full specification.

## Kimi Features

The Kimi Overseer integrates these capabilities into the workflow:

- **Session Management**: Named sessions linked to sprints, auto-created on `[ACTION:delegate]` for SPRINT tasks
- **Dynamic Subagents**: Runtime-created specialist agents via `CreateSubagent` (debugger, performance, docs, test-generator templates)
- **Context Monitoring**: Automatic compaction when context grows large, triggered after `[ACTION:approve]` commits
- **Moonshot Files API**: Upload project files for persistent context across sessions
- **Agent Swarm**: Parallel subagent dispatch for batch reviews and research (K2.5, up to 100 sub-agents)
- **Multi-modal**: Vision + text analysis for UI screenshot reviews (K2.5)

Setup: `./scripts/setup-kimi-project.sh` | Verify: `./scripts/verify-kimi-setup.sh`

## Key Principles

- **Convention over automation** — the system works with just markdown and Git
- **Persistent and auditable** — all communication lives in Git history
- **Incremental adoption** — projects can adopt any phase independently
- **Agent isolation** — each agent works on their own branch, in their own domain
- **Human authority** — Human PM has final sign-off on all production merges

