# Cursor Workforce Setup Guide

Open this file in Cursor and follow the steps to set up your development workforce.

> **Note**: This guide aligns with `.cursor/rules/07-workforce-protocol.mdc`. See that file for the protocol reference.

---

## How It Works

Two types of Cursor chats that work like an engineering team:

```
MANAGER CHAT (1 per sprint — persistent)
│  Plans work, reviews results, tracks progress
│
└── TASK CHAT (1 at a time — focused, disposable)
    Complete one task fully before starting the next
```

**Manager Chat** = Your tech lead. Plans, reviews, tracks. Never writes code.
**Task Chats** = Your developers. One task each, fresh context, report and close.
**You** = The PM. Relay briefs down, results up. This is your quality gate.

### One Task at a Time Rule

Cursor works on **exactly one task** at a time. This is non-negotiable:
- Finish the current task completely before starting the next
- Each task gets full attention — no context splitting
- If a task is blocked, mark it BLOCKED and only then move to the next
- The Manager assigns tasks in strict priority order from `.ai/status.md`
- Never have two Task Chats open simultaneously

This produces higher quality work than multitasking across parallel tasks.

---

## Step 1: Start the Manager Chat

Open a new Cursor Chat (not Composer/Agent). Paste:

```
Read these files before responding:
- AGENTS.md (project conventions and agent boundaries)
- .ai/status.md (current sprint status)
- .ai/boundaries.md (file ownership map)
- .ai/project-vision/README.md (architecture vision)

You are my **Implementation Manager** for ClawLens (Even G1 × OpenClaw Agent Hub). Your role:

1. PLAN — When I describe what to build or fix, break it into tasks:
   - Clear scope (specific files, specific changes)
   - Completable in one focused session
   - Within Cursor's domain (see AGENTS.md)
   - Flag UI-only work for Lovable
   - Consider the three build targets: OpenClaw plugin, Flutter app, Dashboard

2. DELEGATE — One task at a time, in strict priority order:
   TASK: [Short title]
   FILES IN SCOPE: [Files to read and modify]
   OBJECTIVE: [What "done" looks like]
   APPROACH: [Step-by-step plan]
   CONSTRAINTS:
   - [Boundary rules, G1 display limits, security rules]
   ACCEPTANCE CRITERIA:
   - [ ] [Testable criterion]

   IMPORTANT: Only issue the NEXT task after the current one is reviewed
   and marked DONE. Never issue parallel tasks.

3. REVIEW — When I paste a Task Chat's report, check:
   - Meets acceptance criteria?
   - Files within Cursor's domain?
   - Any regressions?
   - G1 display constraints respected?
   - Only mark DONE if ALL criteria pass

4. TRACK — Running status: completed, in progress, remaining, blocked.

You do NOT write code. Plan, delegate, review.
One task at a time. Quality over speed.
Respond with: "Manager ready. What are we working on?"
```

---

## Step 2: Run Task Chats

For each task, open a new **Cursor Agent/Composer** and paste:

```
You are a focused implementation agent for ClawLens. Complete this task and nothing else.
Read the listed files before starting. Follow .cursor/rules/ for standards.

Key project context:
- Three build targets: OpenClaw channel plugin (TS), Flutter glasses app, React dashboard
- Official OpenClaw source: ai-agent-backend/openclaw/ (reference, read-only)
- Even Demo App source: glasses-apps/EvenDemoApp/ (submodule)
- G1 display constraints: 488px width, 5 lines, ~25 chars/line
- OpenClaw gateway runs in Docker, localhost binding only

FOCUS: You have ONE task. Do it thoroughly. Do not start anything else.

When done, provide:
COMPLETED: [Task title]
STATUS: Done | Partial | Blocked
FILES CHANGED:
- [file]: [what changed]
DECISIONS: [Judgment calls made]
ISSUES: [Problems encountered]
TESTS: [How to verify]

Here is your task:
[PASTE MANAGER'S TASK BRIEF]
```

---

## Step 3: Report back

Paste the Task Chat's report into the Manager Chat for review.
**Wait for review approval before opening the next Task Chat.**

---

## Chat Naming

```
MGR: [Feature Name]
  TSK: [Task Title]        ← only one active at a time
```

One Manager per feature. One Task Chat per task. Close tasks when done.
Never open the next task chat until the Manager approves the current one.

---

## Source Code References

When implementing, use these official sources:
- **OpenClaw**: `ai-agent-backend/openclaw/` — the official repo, cloned as submodule
- **Even Demo App**: `glasses-apps/EvenDemoApp/` — the official Flutter app, cloned as submodule
- **Even Hub SDK reference**: `glasses-apps/EH-InNovel/` — Kotlin reference for SDK patterns (read-only)

Do NOT guess at APIs or interfaces. Read the source code in these directories.
