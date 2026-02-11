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

## Issue #6: Runtime File Tracking Workflow

**Severity**: Low  
**Impact**: Maintains full history of agent interactions and metrics  
**Status**: ✅ Resolved (workflow established)

### Problem

Runtime files (chat logs, metrics, session data) change frequently during agent operations. Need a clear workflow for when to commit these files.

### Solution Established

**Tracking Policy**: Keep all runtime files tracked in git for full history.

**Commit Strategy**:
1. **Task Completion**: Commit runtime files when a task is completed
   - Example: `[AGENT:cursor] [ACTION:submit] Update runtime files: chat logs and metrics after task completion`

2. **Periodic Commits**: Commit when files stabilize and pass tests/reviews
   - After successful test runs
   - After code reviews are approved
   - When metrics show stable patterns

3. **Frequency**: Commit runtime files:
   - At task boundaries (task start/complete)
   - After significant agent interactions (Kimi reviews, approvals)
   - When metrics accumulate meaningful data

### Files Tracked

- `.ai/chats/*.md` — Agent-to-agent chat logs
- `.ai/metrics/context-history.json` — Context usage metrics
- `.ai/metrics/wire-metrics.json` — Wire daemon metrics
- `.ai/sessions/active/*.json` — Active session data
- `.ai/sessions/archived/*.json` — Archived session data

### Benefits

- Full audit trail of agent interactions
- Ability to analyze patterns in agent behavior
- Debugging support when issues arise
- Historical context for decision-making

### Implementation

- ✅ Runtime files are tracked (not in `.gitignore`)
- ✅ Commit pattern established: commit at task completion + periodic stabilization
- ✅ Commit messages include context about why runtime files are being committed

---

## Issue #7: API Key Setup for Local vs GitHub Actions (This Project)

**Severity**: Low (Resolved)  
**Impact**: Better tracking and security for API usage  
**Status**: ✅ Configured

> **Note**: See Issue #8 for the general setup pattern that applies to all projects.

### Problem

Initially, the GitHub Actions workflow failed with "insufficient funds" error because `KIMI_API_KEY` secret was not configured in GitHub repository settings.

### Solution Applied

**Separate API Keys for Tracking**:
- **Local Development** (`.env` file): `sk-V1u7bkTPrUtFzSr1nE99Po7pNAuCySVfOKhtIi9CDOY9fet5`
  - Used by: Local server code, post-commit hooks, development scripts
  - Set in: `.env` file (both `MOONSHOT_API_KEY` and `KIMI_API_KEY`)

- **GitHub Actions** (Repository Secret): `sk-8E4NsDODbuY2FnXwqyaEqUceSBAGMCOHiAo1pzc2cmnaA1vt`
  - Used by: GitHub Actions workflows (agent-review.yml, sprint-evaluation.yml)
  - Set in: GitHub repo Settings > Secrets and variables > Actions > `KIMI_API_KEY`

### Benefits

1. **Usage Tracking**: Separate keys allow tracking local development vs CI/CD usage
2. **Security**: Can revoke/rotate keys independently if needed
3. **Debugging**: Easier to identify which environment is making API calls
4. **Cost Management**: Can monitor spending per environment

### Configuration

- ✅ Local `.env` file updated with new API key
- ✅ Both `MOONSHOT_API_KEY` and `KIMI_API_KEY` set (for compatibility)
- ⚠️ **Action Required**: User must manually add GitHub Secret `KIMI_API_KEY` in repository settings

### References

- `.github/workflows/agent-review.yml` — Uses `environment: open-rpg` with `${{ secrets.KIMI_API_KEY }}`
- `.github/workflows/sprint-evaluation.yml` — Uses `environment: open-rpg` with `${{ secrets.KIMI_API_KEY }}`
- `docs/github-actions-automation.md` — Setup instructions
- Issue #8 — General setup pattern for all projects

---

## Issue #8: GitHub Secrets Setup Required for All Projects

**Severity**: High  
**Impact**: Workflows will fail without proper API key configuration  
**Status**: ⚠️ Action Required — Manual Setup Needed

### Problem

All projects using the `.ai/` multi-agent setup require GitHub Secrets to be configured manually. This is a **one-time setup step** that must be completed for each new project, and it's easy to miss during initial project setup.

**Symptoms of missing setup**:
- GitHub Actions workflows fail with "insufficient funds" error
- Automated reviews don't run
- Sprint evaluations fail
- Error: `Failed to run review: insufficient funds`

### Required Setup Per Project

**Each project needs TWO separate API keys** for proper tracking and security:

1. **Local/Project API Key** (for `.env` file):
   - **Variable Names**: `MOONSHOT_API_KEY` and `KIMI_API_KEY` (both set to same value)
   - **Location**: Project root `.env` file
   - **Used By**: 
     - Local server code (RPGJS game server)
     - Post-commit hooks (if running locally)
     - Development scripts
     - LLM integration tests

2. **GitHub Actions API Key** (for GitHub Secrets):
   - **Secret Name**: `KIMI_API_KEY` (exact name, case-sensitive)
   - **Location**: GitHub repo Settings > Environments > `open-rpg` > Environment secrets
   - **Used By**:
     - `.github/workflows/agent-review.yml` — Automated code reviews
     - `.github/workflows/sprint-evaluation.yml` — Sprint evaluation reports

### Setup Instructions for Human

**Step 1: Create Two API Keys**
1. Go to https://platform.moonshot.ai/
2. Navigate to API Keys section
3. Create **two separate API keys**:
   - **Key #1**: For local/project use (`.env` file)
   - **Key #2**: For GitHub Actions (environment secret)

**Step 2: Report Back with Keys**
Provide the following information:
- **Local API Key**: `sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **GitHub Actions API Key**: `sk-YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY`

**Step 3: Implementation**
- Agent will update `.env` file with local API key
- Agent will update workflows to use environment (if needed)
- Human must manually add GitHub Secret (cannot be automated)

### Why Two Separate Keys?

1. **Usage Tracking**: Monitor costs separately for local dev vs CI/CD
2. **Security**: Can revoke/rotate keys independently
3. **Debugging**: Easier to identify which environment is making calls
4. **Cost Management**: Track spending per environment in Moonshot dashboard

### Verification Checklist

For each project, verify:
- [ ] `.env` file exists with `MOONSHOT_API_KEY` and `KIMI_API_KEY` set
- [ ] GitHub Environment `open-rpg` exists
- [ ] Environment secret `KIMI_API_KEY` is configured
- [ ] Workflows reference the environment: `environment: open-rpg`
- [ ] Test commit with `[ACTION:submit]` triggers review successfully

### Projects Affected

This applies to **all projects** using:
- `.ai/` directory structure
- `.github/workflows/agent-review.yml`
- `.github/workflows/sprint-evaluation.yml`
- Multi-agent coordination system

### Action Items

**For New Projects**:
1. Human creates two API keys in Moonshot dashboard
2. Human reports keys to agent
3. Agent updates `.env` file with local key
4. Agent updates workflows (if needed)
5. Human manually adds GitHub Secret `KIMI_API_KEY` to environment
6. Verify with test commit

**For Existing Projects**:
- Check if GitHub Secret exists
- If missing, follow setup instructions above
- Update this issue with project name and status

### References

- `.github/workflows/agent-review.yml` — Requires `KIMI_API_KEY` secret
- `.github/workflows/sprint-evaluation.yml` — Requires `KIMI_API_KEY` secret
- `docs/github-actions-automation.md` — Setup documentation
- Issue #7 — This project's specific setup (resolved)

---

**Last Updated**: 2026-02-10  
**Next Review**: After TASK-006 completion

