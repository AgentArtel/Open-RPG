# OpenClaw × RPGJS — Bootstrap Playbook

## Overview

This project uses a two-agent development workflow:
- **Claude Code** — Orchestrator: architecture, task decomposition, code review, docs
- **Cursor** — Implementation: all production code (game server, agent system, bridge, client)

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed and working
- Cursor IDE installed
- Anthropic API key (for the AI NPC system)

## Step 1: Scaffold the RPGJS Starter

```bash
cd open-rpg
npx degit rpgjs/starter .   # scaffold into current directory (preserving existing files)
npm install
npm run dev                   # verify it runs — open browser, walk around
```

**Note**: The scaffold may overwrite some files. After scaffolding, verify that
AGENTS.md, CLAUDE.md, .cursor/, .ai/, idea/, and docs/ are still intact.
If anything was overwritten, restore from git.

## Step 2: Install Agent System Dependencies

```bash
npm install @anthropic-ai/sdk
```

This is the only significant dependency for the agent system. Everything else
(lane queue, perception engine, skill system, memory) is built from scratch
using OpenClaw-inspired patterns.

## Step 3: Verify Claude Code Sees the Config

```bash
claude
```

Test:
```
What are your responsibilities as orchestrator?
```

**Expected**: Describes task decomposition, delegation to Cursor, code review,
and references AGENTS.md.

```
What phase of the project are we in?
```

**Expected**: References the project outline, identifies current phase.

## Step 4: Set Up the Cursor Workforce

1. Open the project in **Cursor IDE**
2. Open `.ai/CURSOR_WORKFORCE.md`
3. Follow Step 1 to create your **Manager Chat**
4. Test:
   - Ask: "What is your role?" → should describe planning/delegation
   - Ask: "What phase are we in?" → should reference the project outline
   - Ask: "Plan the first task: scaffold the RPGJS starter and create a test NPC"
   - → should produce scoped task briefs

## Step 5: Start Building

Follow the phased plan in `idea/03-project-outline.md`:

```
Phase 0: Environment Setup (you are here)
  ↓
Phase 1: Research Execution (RPGJS deep dive, pattern extraction)
  ↓
Phase 2: Architecture and Planning (ADRs, interfaces, data flow)
  ↓
Phase 3: Core Infrastructure (perception, skills, runner, memory, manager)
  ↓
Phase 4: Bridge Layer (GameChannelAdapter, RPGJS module integration)
  ↓
Phase 5: Integration Testing and MVP Polish
  ↓
Phase 6: Documentation and Handoff
```

## Development Workflow

```
You describe a feature/task
    ↓
Claude Code (terminal) breaks it into tasks → .ai/tasks/
    ↓
Open Cursor Manager Chat, describe the feature
    ↓
Manager produces task briefs
    ↓
Run each brief in a Task Chat (Agent mode)
    ↓
Copy results back to Manager for review
    ↓
Claude Code reviews the PR
    ↓
You merge to main
```

## Quick Reference

| What you want | Where to go |
|---------------|-------------|
| Plan architecture, create tasks | Claude Code (terminal) |
| Break tasks into implementation steps | Cursor Manager Chat |
| Write code | Cursor Task Chat (Agent mode) |
| Review a PR | Claude Code (terminal) |
| Check task status | `.ai/status.md` |
| Check file ownership | `.ai/boundaries.md` |
| See project roadmap | `idea/03-project-outline.md` |
| See architecture decisions | `idea/phase3-integration-patterns.md` |
| See project vision | `idea/01-idea-doc.md` |
| See role/standards | `idea/project-instructions.md` |
