# Walkthrough 3: Existing Lovable Project

You have an older Lovable project that's already been developed for a while.
It might have accumulated some mess — dead code, unclear ownership, multiple
agents having edited files without coordination. This walkthrough gets it
organized.

---

## Prerequisites

- Claude Code CLI installed
- Cursor IDE installed
- Existing Lovable project connected to GitHub
- The repo cloned locally

## What's different from a new project

An existing project has:
- **Existing Cursor rules** that may conflict with the new ones
- **Mixed authorship** — Lovable and Cursor may have both edited the same files
- **Accumulated cruft** — unused components, dead imports, orphaned files
- **No clear boundaries** — nobody knows who owns what

The setup process is the same but Claude Code's analysis phase is more important
because it needs to untangle what already exists.

## Step 1: Take stock of what you have

Before changing anything, check the current state:

```bash
cd ~/your-project
git status                  # clean working tree?
npm run build               # does it build?
npm run lint 2>&1 | tail -5 # how many lint errors?
ls .cursor/rules/           # any existing Cursor rules?
ls .cursorrules 2>/dev/null # old-format rules file?
```

Write down:
- Does the build pass? Y/N
- How many lint errors?
- Any existing .cursor/rules/ or .cursorrules file?

## Step 2: Clone and copy the starter kit

```bash
# From your project root:
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/AGENTS.md .
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/CLAUDE.md .
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/BOOTSTRAP_PLAYBOOK.md .
cp -r PATH/TO/artelio/.ai/templates/multi-agent-starter/.ai .
```

**For .cursor/rules/ — be careful if you have existing rules:**

```bash
# Check what exists first
ls .cursor/rules/ 2>/dev/null
```

**If no existing rules:**
```bash
cp -r PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor .
```

**If you have existing rules:**
```bash
# Only copy the new multi-agent rules, don't overwrite existing ones
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor/rules/00-project-context.mdc .cursor/rules/
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor/rules/05-agent-boundaries.mdc .cursor/rules/
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor/rules/06-task-protocol.mdc .cursor/rules/
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor/rules/07-workforce-protocol.mdc .cursor/rules/
```

**If you have an old `.cursorrules` file (deprecated format):**
The content is probably still useful. We'll have Claude Code migrate it
into the new `.mdc` format during the analysis phase.

## Step 3: Have Claude Code analyze and customize

Open the project in Claude Code:

```bash
claude
```

Paste this prompt (note the extra instructions for existing projects):

```
I need you to set up a multi-agent development workflow for this
EXISTING project. It's been developed for a while with Lovable and
possibly Cursor, and needs to be organized.

Three AI agents will share this repo:

1. **Claude Code (you)** — Orchestrator: architecture, task decomposition,
   code review, DB schema, cross-cutting refactors, root configs
2. **Cursor** — Implementation: business logic, state management, hooks,
   API integration, backend functions, complex components
3. **Lovable** — UI/UX: design system (src/components/ui/), layouts,
   navigation, styling, simple display components

The starter template files are already in place (AGENTS.md, CLAUDE.md,
.cursor/rules/, .ai/). I need you to customize them for this project.

### Phase 1: Deep analysis (most important for an existing project)

1. Read package.json, project structure, and all config files
2. Identify the full tech stack
3. Map EVERY directory and file to the correct agent:
   - Pure visual/markup/styling → Lovable
   - Business logic, state, API calls, complex forms → Cursor
   - Config, routing, schema, docs → Claude Code
4. For EACH component file, check: does it have complex state management,
   API calls, or realtime subscriptions? If yes → Cursor. If it's mostly
   markup and styling → Lovable. This matters because Lovable projects
   often have logic mixed into visual components.
5. Check for existing Cursor rules (.cursor/rules/ or .cursorrules):
   - If .cursorrules exists, migrate its content into proper .mdc files
   - If .cursor/rules/ exist, add YAML frontmatter if missing
   - Merge existing rules with the new multi-agent rules
6. Identify ALL dead code:
   - Components not imported anywhere
   - Hooks not used
   - Pages not referenced in routes
   - Utility files not imported
   - npm dependencies not imported
7. Check for duplicate or near-duplicate components
8. Check for unused routes in the router

### Phase 2: Customize configuration files

Fill in all [REPLACE] placeholders in:
1. AGENTS.md — tech stack, structure, file ownership (be precise)
2. .cursor/rules/00-project-context.mdc — app identity, constraints
3. .cursor/rules/05-agent-boundaries.mdc — specific file lists
4. .ai/lovable-knowledge.md — project details, DO NOT MODIFY lists

Create these project-specific files:
5. .cursor/rules/01-coding-standards.mdc — match existing code style
6. .cursor/rules/02-ui-standards.mdc — match existing UI patterns
7. .cursor/rules/03-backend-standards.mdc — for backend files
8. .cursor/rules/99-verification.mdc — alwaysApply pre-commit checklist
9. .ai/boundaries.md — complete file-to-agent ownership map

### Phase 3: Clean up

1. Remove all dead code (unused components, hooks, utils, pages)
2. Remove unused npm dependencies
3. Fix easy lint errors (prefer-const, unused-expressions, etc.)
4. Run npm audit fix
5. Delete the old .cursorrules file if migrated to .mdc format
6. Verify build still passes

### Phase 4: Document what you found

Create .ai/status.md with:
- A backlog of remaining issues found during analysis
- Count of lint errors, their categories
- Large components that need refactoring
- Any security vulnerabilities that need major upgrades

### Rules:

- Domain boundaries must be FUNCTIONAL, not STRUCTURAL
- When a component mixes UI and logic, assign it to Cursor
  (the more complex agent handles mixed files)
- Preserve existing Cursor rule content — integrate, don't replace
- Every file maps to exactly one agent in boundaries.md

Commit to a feature branch (claude/setup-multi-agent) and push.
Do NOT merge to main yet. Give me a full report of what you found
and changed.
```

**This will take longer than a new project** — Claude Code needs to analyze
every file to figure out who should own what. Let it work.

## Step 4: Review carefully

This is the most important review step. Claude Code will have made judgment
calls about file ownership that you should verify.

```bash
git diff main..claude/setup-multi-agent --stat
```

**Check the boundaries map (.ai/boundaries.md):**
- Open it and scan through
- Do the logic-heavy components make sense as Cursor's?
- Are the simple display components correctly assigned to Lovable?
- Are there files you know should belong to a different agent?

**Check what was deleted:**
```bash
git diff main..claude/setup-multi-agent --diff-filter=D --name-only
```
- Do you recognize any of these as files you actually need?
- If unsure about a deletion, ask Claude Code why it was removed

**Check the build:**
```bash
git checkout claude/setup-multi-agent
npm install
npm run build
```

## Step 5: Set up the Cursor Workforce

Same as a new project:

1. Open in **Cursor IDE** (on the feature branch)
2. Open `.ai/CURSOR_WORKFORCE.md`
3. Create your **Manager Chat** (paste the prompt from the guide)
4. Rename to `MGR: [Your Project] Sprint 1`
5. Test: ask it to plan a task from the backlog in `.ai/status.md`
6. Run a quick Task Chat to verify the full loop works

## Step 6: Configure Lovable

1. Open **Lovable** (app.lovable.dev)
2. **Project Settings → Knowledge**
3. Copy from `.ai/lovable-knowledge.md` (below the `---` line)
4. Paste and save

**Important for existing projects**: If Lovable has been editing files that
are now assigned to Cursor (logic-heavy components), the Knowledge panel
tells Lovable to stop touching them. This is the key behavior change.

## Step 7: Merge

```bash
git checkout main
git merge claude/setup-multi-agent
git push origin main
```

## Step 8: The first organized sprint

Now that ownership is clear, pick something from the backlog:

```
1. Open Claude Code → "Let's work on [backlog item from .ai/status.md]"
2. Claude Code creates a task brief
3. Cursor Manager Chat → break it into implementation steps
4. Task Chats → implement each step
5. Manager reviews → you merge
```

---

## Common issues with existing projects

### "Lovable keeps editing files assigned to Cursor"

Lovable reads Knowledge on every prompt but doesn't enforce it strictly.
If it keeps touching Cursor's files:
- Be explicit in your Lovable prompts: "Only modify the UI markup, don't
  change the state management logic"
- Review Lovable's changes before committing — reject out-of-domain edits
- For logic changes, create a task in `.ai/tasks/` for Cursor instead

### "A component is half UI, half logic — who owns it?"

If it's under ~200 lines with mostly markup and a few `useState` calls →
Lovable. If it has API calls, complex state, realtime subscriptions, or
is over 200 lines → Cursor. When in doubt, Cursor — the more capable
agent handles ambiguity better.

### "My existing Cursor rules conflict with the new ones"

The new `00-project-context.mdc` replaces any generic project context
rule. Your existing domain-specific rules (coding standards, UI patterns,
backend patterns) should be kept — just add YAML frontmatter if missing:

```
---
description: [What this rule is about]
globs: [file patterns it applies to]
alwaysApply: false
---

[Your existing rule content]
```

### "Build broke after cleanup"

Claude Code should catch this, but if it doesn't:
```bash
git stash                          # save Claude's changes
git checkout main                  # go back to working state
npm run build                      # verify main works
git stash pop                      # bring changes back
npm run build 2>&1 | head -20     # see what broke
```
Fix the specific issue, don't revert everything.

---

## Timeline

| Step | Time | Notes |
|------|------|-------|
| Take stock | 5 min | Check build, lint, existing rules |
| Copy starter kit | 3 min | Careful with existing .cursor/rules/ |
| Claude Code analyzes | 10-20 min | Longer for bigger projects |
| Review output | 10 min | Most important step — verify boundaries |
| Set up Cursor workforce | 5 min | Manager chat + test |
| Configure Lovable | 2 min | Paste into settings |
| Merge | 1 min | |
| **Total** | **~40 min** | More review time than a new project |
