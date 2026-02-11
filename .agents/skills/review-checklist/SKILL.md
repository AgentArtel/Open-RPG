---
name: review-checklist
description: Code review standards for Open Artel multi-agent projects. Defines the review checklist, verdict types, boundary violation detection, regression checking, and review file format.
---

## Review Checklist

When reviewing an agent's submitted work, check every item:

### Required Checks

- [ ] **Acceptance criteria met** — Every criterion from the task brief is satisfied
- [ ] **Files within agent boundary** — Agent only modified files in their domain (per AGENTS.md)
- [ ] **No boundary violations** — No changes to files owned by other agents
- [ ] **Build passes** — Project builds without errors (if applicable)
- [ ] **No regressions** — Existing functionality still works
- [ ] **Consistent with conventions** — Code follows project style and patterns
- [ ] **Commit message format** — Uses `[AGENT:x] [ACTION:y] [TASK:z]` header
- [ ] **Task brief updated** — Task status reflects current state

### Optional Checks (when applicable)

- [ ] **Tests pass** — All existing tests still pass
- [ ] **New tests added** — New functionality has test coverage
- [ ] **Types correct** — TypeScript types are accurate, no `any` usage
- [ ] **Error handling** — Async operations have proper error handling
- [ ] **Documentation updated** — Relevant docs reflect changes

## Verdict Types

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| **APPROVED** | All required checks pass | Merge to `pre-mortal`, assign next task |
| **CHANGES REQUESTED** | Minor issues found, fixable | Agent addresses feedback, re-submits |
| **REJECTED** | Fundamental problems, wrong approach | Task re-scoped or reassigned |

### Decision Criteria

- **APPROVED**: All required checks pass. Minor style issues can be noted but don't block.
- **CHANGES REQUESTED**: One or more required checks fail, but the approach is sound. Provide specific feedback on what to fix.
- **REJECTED**: Approach is fundamentally wrong, boundary violations are severe, or work doesn't match the task brief at all.

## Boundary Violation Detection

### How to Check

1. **Read the task brief** — Check which files are in scope
2. **Read the diff** — `git diff HEAD~1` or `git diff <branch>`
3. **Compare against AGENTS.md** — Verify each modified file is in the agent's domain
4. **Check `.ai/boundaries.md`** — For detailed ownership rules

### Common Violations

| Violation | Example | Severity |
|-----------|---------|----------|
| Cursor modifies UI components | `src/components/ui/Button.tsx` | High — Lovable's domain |
| Lovable modifies hooks with logic | `src/hooks/use-gateway-api.ts` | High — Cursor's domain |
| Any agent modifies config | `package.json`, `tsconfig.json` | Medium — Claude Code's domain |
| Any agent modifies `.ai/` files | `.ai/tasks/TASK-001.md` | Low — usually Claude Code's domain |

### Response to Violations

- **High severity**: REJECT — agent must not modify other agents' files
- **Medium severity**: CHANGES REQUESTED — remove unauthorized changes
- **Low severity**: Note in review, approve if changes are minor and correct

## Regression Checking

### What to Check

1. **Build status** — Does the project still build?
2. **Test suite** — Do existing tests still pass?
3. **Related features** — Do features that depend on changed code still work?
4. **UI consistency** — Do visual components still render correctly?

### How to Check

```bash
# Build check
npm run build

# Test check
npm run test

# Type check
npx tsc --noEmit

# Lint check
npm run lint
```

### Regression Response

- If build breaks: REJECT immediately
- If tests fail: CHANGES REQUESTED with specific test failures
- If related features break: CHANGES REQUESTED with reproduction steps
- If UI inconsistency: CHANGES REQUESTED with screenshots or descriptions

## Review File Format

Reviews are written to `.ai/reviews/<task-id>-review.md`.

See `.ai/templates/review.md` for the complete template.

Key sections:
- **Checklist** — All items checked/unchecked
- **Files Reviewed** — Table of files with assessments
- **Findings** — Numbered list of observations
- **Feedback** — Specific guidance for the agent
- **Decision** — Verdict and next action

## Review Commit Format

After completing a review, commit with:

```
[AGENT:kimi] [ACTION:approve] [TASK:TASK-XXX] Brief summary
```

or

```
[AGENT:kimi] [ACTION:reject] [TASK:TASK-XXX] Brief reason

See .ai/reviews/TASK-XXX-review.md for details.
```

