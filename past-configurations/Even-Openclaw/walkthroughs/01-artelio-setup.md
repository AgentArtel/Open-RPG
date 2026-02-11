# Walkthrough 1: Setting Up Artelio (Already Configured)

Everything is built — you just need to activate it.

---

## Prerequisites

- [x] Claude Code CLI installed
- [x] Cursor IDE installed
- [x] Artelio repo cloned locally
- [x] Lovable project connected to GitHub

## Step 1: Merge the setup branch

The multi-agent infrastructure is on branch `claude/review-cleanup-project-05gUD`.

```bash
cd ~/artelio   # or wherever your repo lives
git checkout main
git pull origin main
git merge claude/review-cleanup-project-05gUD
git push origin main
```

This puts all the config files on `main` so every tool picks them up.

## Step 2: Verify Claude Code sees the config

Open a terminal in the Artelio repo directory.

```bash
claude
```

Once Claude Code starts, type:

```
What are your responsibilities as orchestrator?
```

**Expected**: It describes task decomposition, delegation to Cursor and Lovable,
code review, and references AGENTS.md. If it does, CLAUDE.md is loading correctly.

Try one more:

```
What files does Cursor own?
```

**Expected**: Lists supabase/functions/, hooks, services, logic-heavy components
like EntitiesManager.tsx. This confirms AGENTS.md is being read.

**Exit Claude Code** (`/exit` or Ctrl+C) — you'll come back to it when you
need to plan work.

## Step 3: Set up the Cursor Workforce

Open the Artelio project in **Cursor IDE**.

### 3a. Create the Manager Chat

1. Open a **new Chat** (Cmd/Ctrl+L, or Chat panel → New Chat)
2. **Rename it**: `MGR: Artelio Sprint 1` (right-click the chat tab)
3. Paste this as your first message:

```
Read these files before responding:
- AGENTS.md (project conventions and agent boundaries)
- .ai/status.md (current sprint status)
- .ai/boundaries.md (file ownership map)

You are my **Implementation Manager** for the Artelio project. Your role:

1. PLAN — When I describe what I want to build or fix, break it into
   discrete implementation tasks. Each task should:
   - Have a clear scope (specific files, specific changes)
   - Be completable in one focused session
   - Stay within Cursor's domain (see AGENTS.md boundaries)
   - If it needs UI-only work, flag it for Lovable instead

2. DELEGATE — For each task, produce a task brief I can paste into a
   separate Task Chat. Use this format:

   TASK: [Short title]
   FILES IN SCOPE: [List specific files to read and modify]
   OBJECTIVE: [What "done" looks like]
   APPROACH: [Step-by-step implementation plan]
   CONSTRAINTS:
   - Stay within Cursor's file boundaries (see AGENTS.md)
   - Do not modify src/components/ui/ (Lovable's domain)
   - Do not modify auto-generated files
   ACCEPTANCE CRITERIA:
   - [ ] [Specific testable criterion]
   - [ ] [Specific testable criterion]
   - [ ] npm run build passes

3. REVIEW — When I paste back a Task Chat's completion report, review it:
   - Did the changes meet the acceptance criteria?
   - Any files modified outside Cursor's domain?
   - Any regressions or concerns?
   - What should be done next?

4. TRACK — Maintain a running status of tasks for this session:
   - What's been completed
   - What's in progress
   - What's remaining
   - Any blockers or dependencies

You do NOT write code. You plan, delegate, and review.
Respond with: "Manager ready. What are we working on?"
```

4. Wait for: **"Manager ready. What are we working on?"**

### 3b. Test with a real task

Tell the Manager:

```
I want to fix the 30 exhaustive-deps warnings in our hooks and pages.
```

**Expected**: The Manager reads the project files, identifies which files have
the warnings, and produces 3-5 scoped task briefs (e.g., "Fix exhaustive-deps
in cognitive hooks", "Fix exhaustive-deps in dev pages").

### 3c. Run your first Task Chat

1. Copy the first task brief from the Manager
2. Open a **new Composer/Agent** (Cmd/Ctrl+I, or Agent panel)
3. Rename it: `TSK: Fix exhaustive-deps cognitive hooks`
4. Paste:

```
You are a focused implementation agent. Complete this task and nothing else.
Read the files listed below before starting. Follow the project's
.cursor/rules/ for coding standards and boundaries.

When you are done, provide a completion report in this format:

COMPLETED: [task title]
STATUS: Done | Partial | Blocked
FILES CHANGED:
- [file]: [what changed]
DECISIONS: [any judgment calls you made]
ISSUES: [problems encountered, if any]
TESTS: [how to verify this works]

Here is your task:

[PASTE THE MANAGER'S TASK BRIEF HERE]
```

5. Let the agent work
6. Copy the completion report
7. Go back to Manager Chat and paste:

```
Task result:

[PASTE COMPLETION REPORT]

Please review against the acceptance criteria.
```

8. Manager reviews and tells you what's next

### 3d. Verify the boundaries work

Ask the Task Chat (while it's still open):

```
Also update the Button component in src/components/ui/button.tsx
```

**Expected**: It should warn that `src/components/ui/` is Lovable's domain
and refuse or flag the conflict.

## Step 4: Configure Lovable

1. Open the Artelio project in **Lovable** (app.lovable.dev)
2. Go to **Project Settings → Knowledge**
3. Open `.ai/lovable-knowledge.md` in your local editor
4. Copy everything below the `---` line
5. Paste it into the Knowledge field
6. Save

### Test Lovable boundaries

Ask Lovable:

```
Modify the useAuth hook in src/hooks/useAuth.tsx to add a logout timer
```

**Expected**: Lovable should warn that hooks are outside its domain, or at minimum
reference that Cursor handles hooks.

## Step 5: You're live

Your workflow is now:

```
You think of a feature
    ↓
Claude Code (terminal) breaks it into tasks → .ai/tasks/
    ↓
You open Cursor Manager Chat, describe the feature
    ↓
Manager produces task briefs
    ↓
You run each brief in a Task Chat (Agent mode)
    ↓
Copy results back to Manager for review
    ↓
For UI-only tasks → relay to Lovable
    ↓
Claude Code reviews the PR
    ↓
You merge to main
```

## Quick Reference Card

| What you want | Where to go |
|---------------|-------------|
| Plan architecture, create tasks | Claude Code (terminal) |
| Break tasks into implementation steps | Cursor Manager Chat |
| Write code | Cursor Task Chat (Agent mode) |
| Build UI components, fix styling | Lovable |
| Review a PR | Claude Code (terminal) |
| Check task status | `.ai/status.md` |
| Check file ownership | `.ai/boundaries.md` |
| See full workforce guide | `.ai/CURSOR_WORKFORCE.md` |
