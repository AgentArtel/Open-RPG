---
name: boundary-enforcement
description: File ownership rules and boundary enforcement for Open Artel multi-agent projects. Defines which agent owns which files, how to check boundaries, and consequences of violations.
---

## File Ownership Principles

Each file in the project is owned by exactly one agent. Agents must only modify files within their domain. This prevents conflicts, ensures accountability, and makes reviews straightforward.

### General Rules

| Domain | Owner | Examples |
|--------|-------|---------|
| **Business logic** | Cursor | Hooks, services, API clients, utilities, logic-heavy components |
| **Visual components** | Lovable | Design system (`ui/`), layouts, navigation, styling, CSS |
| **Config and docs** | Claude Code | AGENTS.md, package.json, tsconfig, .ai/, docs/ |
| **Oversight files** | Kimi Code | Reviews, instructions, status updates (via `.ai/`) |

### Typical File Ownership Map

```
src/
├── components/
│   ├── ui/              → Lovable (design system primitives)
│   └── [features]/      → Cursor (feature components with logic)
├── pages/               → Cursor (route pages with logic)
├── hooks/               → Cursor (custom hooks, except UI-only)
├── services/            → Cursor (API integration layer)
├── lib/                 → Cursor (shared utilities)
├── types/               → Claude Code (TypeScript type definitions)
├── App.tsx              → Claude Code (main router)
├── main.tsx             → Claude Code (app entry)
├── index.css            → Lovable (global styles)
└── App.css              → Lovable (app styles)

.ai/                     → Claude Code (coordination layer)
docs/                    → Claude Code (documentation)
package.json             → Claude Code (dependencies)
tsconfig*.json           → Claude Code (TypeScript config)
vite.config.ts           → Claude Code (build config)
tailwind.config.ts       → Claude Code (styling config)
```

For the complete and project-specific ownership map, always check `.ai/boundaries.md`.

## Communication Folder Ownership

| Folder | Who Writes | Who Reads |
|--------|-----------|-----------|
| `.ai/tasks/` | Claude Code | All agents |
| `.ai/instructions/` | Kimi, Claude Code | Target agent |
| `.ai/reviews/` | Kimi, Claude Code | Submitting agent + Human |
| `.ai/reports/` | All agents | Human + all agents |
| `.ai/chats/` | All agents | All agents |
| `.ai/ideas/` | Claude Code | All agents + Human |
| `.ai/templates/` | Claude Code | All agents |

## How to Check Boundaries Before Modifying Files

### Before Starting Work

1. **Read the task brief** — `.ai/tasks/TASK-XXX.md` lists files in scope
2. **Check AGENTS.md** — The "Owns" section under your agent role
3. **Check `.ai/boundaries.md`** — For the complete ownership map
4. **When in doubt, ask** — Use `.ai/chats/` to clarify with the orchestrator

### Before Committing

1. **Review your diff** — `git diff --stat` to see all modified files
2. **Verify each file** — Is every modified file in your domain?
3. **Remove unauthorized changes** — `git checkout -- <file>` for files outside your domain
4. **Document exceptions** — If you must touch another agent's file, explain in the commit body

## Boundary Violation Consequences

| Severity | Violation | Consequence |
|----------|-----------|-------------|
| **High** | Modifying another agent's core files | REJECT — must revert changes |
| **Medium** | Modifying shared config without approval | CHANGES REQUESTED — remove or get approval |
| **Low** | Minor touch to adjacent file (e.g., import fix) | Note in review — approve if justified |

### Examples of Violations

| Agent | Violation | Why It's Wrong |
|-------|-----------|---------------|
| Cursor edits `src/components/ui/Button.tsx` | Lovable owns design system | Cursor should request Lovable to make UI changes |
| Lovable adds a hook to `src/hooks/use-auth.ts` | Cursor owns hooks with logic | Lovable should request Cursor to add the hook |
| Any agent edits `package.json` | Claude Code owns config | Request Claude Code to add dependencies |
| Any agent edits `.ai/tasks/` | Claude Code owns task briefs | Report status via `.ai/reports/` instead |

### Exceptions

Some situations justify cross-boundary changes:

1. **Import statements** — Adding an import for a new export is usually acceptable
2. **Type definitions** — Updating shared types may be necessary
3. **Emergency fixes** — Critical bugs may require immediate cross-boundary fixes

All exceptions must be documented in the commit message body and flagged in the review.

## Reference

- Complete ownership map: `.ai/boundaries.md`
- Agent roles and domains: `AGENTS.md`
- Review process: `review-checklist` skill

