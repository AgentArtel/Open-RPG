# Cursor Workforce Setup Guide — Generic Template
#
# Copy this file to your project as .ai/CURSOR_WORKFORCE.md
# Replace [BRACKETED] items with your project specifics.
# Delete this header when done.

# Cursor Workforce Setup Guide

Open this file in Cursor and follow the steps to set up your development workforce.

---

## How It Works

Two types of Cursor chats that work like an engineering team:

```
MANAGER CHAT (1 per sprint — persistent)
│  Plans work, reviews results, tracks progress
│
├── TASK CHAT (1 per task — disposable)
│   Focused implementation, reports back when done
├── TASK CHAT
└── ...
```

**Manager Chat** = Your tech lead. Plans, reviews, tracks. Never writes code.
**Task Chats** = Your developers. One task each, fresh context, report and close.
**You** = The PM. Relay briefs down, results up. This is your quality gate.

---

## Step 1: Start the Manager Chat

Open a new Cursor Chat (not Composer/Agent). Paste:

```
Read these files before responding:
- AGENTS.md (project conventions and agent boundaries)
- .ai/status.md (current sprint status)
- .ai/boundaries.md (file ownership map)

You are my **Implementation Manager** for [PROJECT NAME]. Your role:

1. PLAN — When I describe what to build or fix, break it into tasks:
   - Clear scope (specific files, specific changes)
   - Completable in one focused session
   - Within Cursor's domain (see AGENTS.md)
   - Flag UI-only work for Lovable

2. DELEGATE — Produce task briefs using this format:
   TASK: [Title]
   FILES IN SCOPE: [files]
   OBJECTIVE: [what done looks like]
   APPROACH: [step by step]
   CONSTRAINTS: [boundaries]
   ACCEPTANCE CRITERIA: [testable items]

3. REVIEW — When I paste a Task Chat's report, check:
   - Meets acceptance criteria?
   - Files within Cursor's domain?
   - Any regressions?

4. TRACK — Running status: completed, in progress, remaining, blocked.

You do NOT write code. Plan, delegate, review.
Respond with: "Manager ready. What are we working on?"
```

---

## Step 2: Run Task Chats

For each task, open a new **Cursor Agent/Composer** and paste:

```
You are a focused implementation agent. Complete this task and nothing else.
Read the listed files before starting. Follow .cursor/rules/ for standards.

When done, provide:
COMPLETED: [title]
STATUS: Done | Partial | Blocked
FILES CHANGED: [file: what changed]
DECISIONS: [judgment calls]
ISSUES: [problems]
TESTS: [how to verify]

Here is your task:
[PASTE MANAGER'S TASK BRIEF]
```

---

## Step 3: Report back

Paste the Task Chat's report into the Manager Chat for review.

---

## Chat Naming

```
MGR: [Feature Name]
  TSK: [Task Title]
  TSK: [Task Title]
```

One Manager per feature. One Task Chat per task. Close tasks when done.
