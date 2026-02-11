# Multi-Agent System Issues & Improvements

**Created**: 2026-02-10  
**Status**: Active tracking  
**Purpose**: Document workflow issues, gotchas, and improvements needed for the multi-agent system

---

## Issue #1: Commit Message Routing Headers Not Being Used

**Severity**: Medium  
**Impact**: Kimi automation not triggered, reviews delayed  
**Status**: Needs enforcement

### Problem

Agents are not using the required commit message routing header format:
```
[AGENT:agent] [ACTION:action] [TASK:task-id] Description
```

**Example of missing headers:**
- Recent commit: `feat: Complete TASK-005 LLM Integration + TASK-003/004 foundation`
- Should be: `[AGENT:cursor] [ACTION:submit] [TASK:TASK-005] Complete LLM integration test`

### Impact

- Post-commit hook skips commits without routing headers
- Kimi automated review not triggered
- No automatic status updates or chat logging
- Manual review required instead of automated workflow

### Root Cause

- Cursor rules don't explicitly require routing headers in commit messages
- No pre-commit validation
- Agents may not be aware of the git-routing skill requirements

### Solution

1. **Update Cursor rules** (`.cursor/rules/00-project-context.mdc`):
   - Add explicit requirement: "ALL commits MUST use routing header format: `[AGENT:cursor] [ACTION:submit] [TASK:XXX] Description`"
   - Reference `.agents/skills/git-routing/SKILL.md` for format details

2. **Add to pre-commit checklist** (`.cursor/rules/99-verification.mdc`):
   - Check commit message format before committing
   - Validate routing headers are present

3. **Update AGENTS.md Git Workflow section**:
   - Explicitly state routing header requirement
   - Provide examples for each agent

4. **Consider pre-commit hook**:
   - Validate commit message format
   - Warn if routing headers missing

### References

- `.agents/skills/git-routing/SKILL.md` — Full routing specification
- `.git/hooks/post-commit` — Hook that processes routing headers
- `docs/claude-kimi-coordination.md` — Coordination patterns

---

## Issue #2: Agent Communication Not Aligning with Rules

**Severity**: Medium  
**Impact**: Inconsistent workflow, missed automation triggers  
**Status**: Needs documentation

### Problem

Agent communication (via commits, chats, instructions) doesn't consistently follow the established rules:
- Commit messages don't use routing headers
- Chat logs may not follow `.ai/chats/` format
- Instructions may not match `.ai/templates/` format

### Impact

- Automation doesn't trigger
- Coordination breaks down
- Status tracking becomes manual
- Reviews delayed or missed

### Solution

1. **Enforce routing headers** (see Issue #1)
2. **Document chat format** in Cursor rules
3. **Create validation script** to check commit message format
4. **Add reminders** in task completion checklist

---

## Issue #3: Vite Doesn't Auto-Load .env for Server-Side Code

**Severity**: Low (Fixed)  
**Impact**: Environment variables not available in server code  
**Status**: Resolved with workaround

### Problem

Vite automatically loads `.env` files for client-side code, but **not for server-side code** in the RPGJS build.

**Discovery**: TASK-005 LLM test failed because `process.env.MOONSHOT_API_KEY` was undefined, even though `.env` file existed.

### Solution Applied

- Installed `dotenv` package
- Added `import 'dotenv/config'` to `src/agents/core/llm-test.ts`
- This explicitly loads `.env` file for server-side code

### Gotcha for Future

- **All server-side code** that needs environment variables must import `dotenv/config` at the top
- Or create a shared `src/config/env.ts` that loads dotenv once and exports env vars
- Document this in `.cursor/rules/` for future reference

### Recommendation

Create `src/config/env.ts`:
```typescript
// Load .env file once for all server-side code
import 'dotenv/config';

export const ENV = {
  MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || null,
  // Add other env vars as needed
} as const;
```

Then import from this file instead of `process.env` directly.

---

## Issue #4: No Pre-Commit Validation for Routing Headers

**Severity**: Low  
**Impact**: Commits can be made without routing headers  
**Status**: Enhancement needed

### Problem

There's no validation to ensure commit messages follow the routing header format before commits are made.

### Solution

1. **Add pre-commit hook** (or update existing):
   - Validate commit message format
   - Warn if routing headers missing
   - Option to bypass with `--no-verify` for emergency commits

2. **Update Cursor rules** to remind agents to check format before committing

---

## Issue #5: Kimi Overseer Not Automatically Triggered

**Severity**: Low  
**Impact**: Manual intervention required for reviews  
**Status**: Expected behavior, but needs better documentation

### Problem

Kimi overseer automation only triggers when:
1. Commit has routing headers (`[AGENT:...] [ACTION:...]`)
2. Kimi CLI is installed and available
3. Action type triggers automation (`submit`, `approve`, `report`, `evaluate`)

**Current state**: Hook is installed, but commits don't have routing headers, so automation never triggers.

### Solution

- Fix Issue #1 (routing headers) will resolve this
- Document in onboarding that agents must use routing headers
- Add to task completion checklist

---

## Action Items

### Immediate (Before Next Sprint)

- [ ] Update `.cursor/rules/00-project-context.mdc` to require routing headers
- [ ] Update `.cursor/rules/99-verification.mdc` to check commit message format
- [ ] Update `AGENTS.md` Git Workflow section with routing header requirement
- [ ] Document Vite .env gotcha in `.cursor/rules/` or `docs/`

### Short Term

- [ ] Create `src/config/env.ts` for centralized environment variable access
- [ ] Add pre-commit hook validation for routing headers
- [ ] Create agent onboarding checklist that includes routing header format

### Long Term

- [ ] Consider commit message template in git config
- [ ] Add automated testing for routing header format
- [ ] Create validation script for multi-agent workflow compliance

---

## Lessons Learned

1. **Routing headers are critical** — Without them, the entire automation workflow breaks
2. **Vite .env behavior** — Server-side code needs explicit `dotenv/config` import
3. **Documentation gaps** — Rules exist but aren't enforced or prominently displayed
4. **Agent awareness** — Agents need clear, visible reminders about workflow requirements

---

## Related Documentation

- `.agents/skills/git-routing/SKILL.md` — Routing header specification
- `.agents/skills/open-artel-workflow/SKILL.md` — Workflow patterns
- `docs/claude-kimi-coordination.md` — Coordination guide
- `.git/hooks/post-commit` — Automation hook
- `.cursor/rules/00-project-context.mdc` — Core agent rules

---

**Last Updated**: 2026-02-10  
**Next Review**: After TASK-006 completion

