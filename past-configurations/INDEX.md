# Past Configurations Index

This directory contains snapshots from real projects that used the Open Artel multi-agent workflow. Study these before starting a new project to learn from actual experience.

## How to Use

1. Read this index to find a past configuration relevant to your project
2. Run `./scripts/extract-past-lessons.sh <config-name>` to extract structured lessons
3. Run `./scripts/compare-project-structure.sh <config-name>` to compare against your project
4. Apply successful patterns, avoid failed patterns
5. Document what you applied in `.ai/lessons/applied-lessons.md`

See the `learn-from-past` skill (`.agents/skills/learn-from-past/SKILL.md`) for the full process.

---

## Even-Openclaw

**Directory**: `Even-Openclaw/`

- **Project Type**: Full-stack (React + Supabase + Flutter + OpenClaw AI agent plugin)
- **Agents**: Claude Code (Orchestrator), Cursor (Implementation), Lovable (UI/UX + Supabase Executor)
- **Phases**: 4
  - P1: Proof of Concept (12 tasks — all completed)
  - P2: Frontend + Phased Agent Foundation (8 steps — all completed)
  - P3: Real Data (3 tasks — mostly completed, 1 partial)
  - P4: OpenClaw Gateway (4 tasks — all completed)
- **Total Tasks**: 23 task files, 30+ work items across all phases
- **Duration**: Multi-sprint development cycle

### Key Files

| File | What It Contains |
|------|-----------------|
| `status.md` | Sprint tracking across 4 phases with task tables and completion status |
| `boundaries.md` | Detailed file-to-agent ownership map for 3 agents + DO NOT EDIT section |
| `tasks/` | 23 task briefs covering create, modify, fix, debug, and escalation types |
| `project-vision/README.md` | Full architecture vision with system diagram (glasses + phone + server + dashboard) |
| `CURSOR_WORKFORCE.md` | Manager/Task Chat workforce protocol with prompt templates |
| `walkthroughs/` | 2 setup walkthroughs (existing project, new Lovable project) |
| `templates/` | Evolved templates including multi-agent-starter and cursor rules |

### Successful Patterns

- **Phased approach**: 4 clear phases with increasing complexity (PoC → Frontend → Real Data → Integration)
- **Explicit file ownership**: Every file mapped to exactly one agent in `boundaries.md`
- **Detailed task briefs**: Tasks include context, objective, specs, acceptance criteria, and "Do NOT" sections
- **Escalation protocol**: Dedicated escalation task format for critical regressions (TASK-ESCALATE-CHAT-REGRESSION)
- **Workforce protocol**: Manager Chat + Task Chat pattern with strict one-task-at-a-time rule
- **Phase-scoped task IDs**: TASK-P3-01, TASK-P4-02 — easy to identify which phase a task belongs to

### Known Issues

- **Partial completions**: TASK-P3-03 remained PARTIAL — some items deferred to future phases
- **Escalation needed**: Chat regression required cross-agent debugging (TASK-ESCALATE-CHAT-REGRESSION)
- **Submodule complexity**: Reference codebases as git submodules added complexity to git operations

### When to Reference

- React + Supabase projects
- Multi-target builds (web + mobile + backend plugin)
- Projects requiring phased rollout
- Any project using the three-agent workflow
- Projects integrating with external APIs or platforms

---

## Adding New Past Configurations

When a project using the Open Artel workflow reaches a significant milestone:

1. Create a directory: `past-configurations/<ProjectName>/`
2. Copy coordination files: `status.md`, `boundaries.md`, `tasks/`, relevant docs
3. Remove any secrets, API keys, or sensitive data
4. Add an entry to this INDEX.md with the same structure as above
5. Run `./scripts/extract-past-lessons.sh <ProjectName>` to generate a lessons file

