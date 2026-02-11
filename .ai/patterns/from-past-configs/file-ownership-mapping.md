# Pattern: File Ownership Mapping

**Source**: Even-Openclaw
**Category**: Structure

## Description

Map every file and directory in the project to exactly one agent in a `boundaries.md` file. Assignments are based on what the code does (function), not where it lives (location).

## Evidence

Even-Openclaw mapped 50+ files across 4 sections:
- **Claude Code (Orchestrator)**: AGENTS.md, CLAUDE.md, .ai/**, configs, schemas, docs
- **Cursor (Implementation)**: index.ts, channel adapters, hooks, services, types, logic-heavy components
- **Lovable (UI/UX)**: src/components/ui/**, layouts, navigation, display components, global CSS
- **DO NOT EDIT**: Auto-generated files, external references, lock files, .env

Key insight: A component with 500 lines of state management belongs to Cursor even if it lives in `src/components/`. Assignment is by function, not by directory.

## When to Use

- Every project using the multi-agent workflow
- During bootstrap (Phase 1 of the Bootstrap Playbook)
- When adding new directories or major files to the project

## How to Apply

1. **During bootstrap**, have Claude Code analyze every directory and file
2. **Classify by function**:
   - Pure visual/markup/styling → Lovable
   - Business logic, state, API calls, complex forms → Cursor
   - Config, routing, schema, docs, coordination → Claude Code
3. **Create `boundaries.md`** with a table per agent section
4. **Include a DO NOT EDIT section** for auto-generated files, lock files, .env
5. **Format**: `| Path | Notes |` — one row per file or directory
6. **Update when adding new files** — boundaries should always be current
7. **Reference in task briefs** — every task should check boundaries before modifying files

## Variations

- **Directory-level**: For large projects, map at the directory level instead of individual files
- **Shared files**: If a file truly needs multiple agents, designate one as primary owner and document the shared access rule
- **Supabase note**: Even-Openclaw documented that Lovable *executes* pre-written SQL but does NOT design schemas — the boundary was on the action, not just the file

