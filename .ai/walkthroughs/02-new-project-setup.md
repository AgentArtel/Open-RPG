# Walkthrough 2: Brand New Lovable Project

You're starting a brand new project on Lovable and want the multi-agent
workflow from day one.

---

## Prerequisites

- Claude Code CLI installed
- Cursor IDE installed
- Lovable account

## Step 1: Create the project in Lovable

1. Go to **app.lovable.dev** → New Project
2. Describe your app (Lovable will generate the initial code)
3. Let Lovable build the foundation: pages, components, routing, styling
4. Connect to GitHub:
   - Project Settings → GitHub → Connect Repository
   - This creates a GitHub repo and pushes Lovable's generated code

**Tip**: Let Lovable do the initial UI scaffolding first. Get the basic pages,
navigation, and design system in place before switching to the multi-agent
workflow. Lovable is fastest at generating UI from scratch.

## Step 2: Clone the repo locally

```bash
git clone https://github.com/YOUR-ORG/YOUR-PROJECT.git
cd YOUR-PROJECT
npm install
npm run build   # verify it builds clean
```

## Step 3: Copy the starter kit

If you have the Artelio repo with the starter kit:

```bash
# From your NEW project root:
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/AGENTS.md .
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/CLAUDE.md .
cp PATH/TO/artelio/.ai/templates/multi-agent-starter/BOOTSTRAP_PLAYBOOK.md .
cp -r PATH/TO/artelio/.ai/templates/multi-agent-starter/.cursor .
cp -r PATH/TO/artelio/.ai/templates/multi-agent-starter/.ai .
```

Or if you don't have it handy, create the files manually — see the
BOOTSTRAP_PLAYBOOK.md for the full list.

**Verify the files are in place:**

```bash
ls -la AGENTS.md CLAUDE.md
ls -la .cursor/rules/
ls -la .ai/
```

You should see:
```
AGENTS.md
CLAUDE.md
.cursor/rules/00-project-context.mdc
.cursor/rules/05-agent-boundaries.mdc
.cursor/rules/06-task-protocol.mdc
.cursor/rules/07-workforce-protocol.mdc
.ai/CURSOR_WORKFORCE.md
.ai/lovable-knowledge.md
.ai/status.md
.ai/tasks/.gitkeep
.ai/templates/task.md
```

## Step 4: Have Claude Code analyze and customize

Open the project in Claude Code:

```bash
claude
```

Paste the following prompt:

```
I need you to set up a multi-agent development workflow for this project.
Three AI agents will share this repo:

1. **Claude Code (you)** — Orchestrator: architecture, task decomposition,
   code review, DB schema, cross-cutting refactors, root configs
2. **Cursor** — Implementation: business logic, state management, hooks,
   API integration, backend functions, complex components
3. **Lovable** — UI/UX: design system (src/components/ui/), layouts,
   navigation, styling, simple display components

The starter template files are already in place (AGENTS.md, CLAUDE.md,
.cursor/rules/, .ai/). I need you to customize them for this specific project.

Please do the following:

### Phase 1: Analyze the codebase

1. Read package.json, the project structure, and key config files
2. Identify the tech stack (framework, backend, styling, state management)
3. Map every directory and major file to the correct agent based on what
   the code actually does (not just where it lives):
   - Pure visual/markup/styling → Lovable
   - Business logic, state, API calls, complex forms → Cursor
   - Config, routing, schema, docs, coordination → Claude Code
4. Identify any dead code, unused dependencies, or clutter

### Phase 2: Customize the configuration files

Fill in all [REPLACE] placeholders in:
1. AGENTS.md — tech stack, project structure, file ownership per agent
2. .cursor/rules/00-project-context.mdc — app identity, constraints
3. .cursor/rules/05-agent-boundaries.mdc — specific file lists per domain
4. .ai/lovable-knowledge.md — project name, DO NOT MODIFY lists

Also create these project-specific files:
5. .cursor/rules/01-coding-standards.mdc — with globs for src/**/*.{ts,tsx}
6. .cursor/rules/02-ui-standards.mdc — with globs for src/components/**
7. .cursor/rules/03-backend-standards.mdc — with globs for backend files
8. .cursor/rules/99-verification.mdc — alwaysApply pre-commit checklist
9. .ai/boundaries.md — complete file-to-agent ownership map

### Phase 3: Clean up

1. Remove any dead code, unused components, or files not imported anywhere
2. Remove unused npm dependencies
3. Fix easy lint errors (prefer-const, no-unused-expressions, etc.)
4. Run npm audit fix for security patches
5. Verify build passes after all changes

### Rules:

- Domain boundaries must be FUNCTIONAL (based on what code does), not
  STRUCTURAL (based on directory name)
- AGENTS.md should reference existing docs rather than duplicating
- Cursor rules must use proper .mdc format with YAML frontmatter
- Every file should map to exactly one agent in boundaries.md
- Auto-generated files should be marked DO NOT EDIT for all agents

Commit to a feature branch (claude/setup-multi-agent) and push.
Do NOT merge to main yet.
```

**Wait for Claude Code to finish.** It will:
- Read your entire codebase
- Fill in all the placeholders
- Create the boundaries map
- Add project-specific Cursor rules
- Clean up dead code
- Commit and push to a review branch

## Step 5: Review Claude Code's output

```bash
git diff main..claude/setup-multi-agent --stat
```

Check:
- [ ] AGENTS.md has your actual tech stack and file ownership
- [ ] .ai/boundaries.md maps every directory to an agent
- [ ] .cursor/rules/ files have valid YAML frontmatter
- [ ] Build still passes: `npm run build`

## Step 6: Set up the Cursor Workforce

1. Open the project in **Cursor IDE** (on the feature branch)
2. Open `.ai/CURSOR_WORKFORCE.md`
3. Follow Step 1 to create your **Manager Chat**:
   - New Chat → paste the Manager prompt from the guide
   - Rename to `MGR: [Your Feature]`
4. Test it:
   - Ask: "What is your role?" → should describe planning/delegation
   - Ask: "Plan a simple feature: add a loading spinner to the home page"
   - → should produce a scoped task brief
5. Run a Task Chat with the brief:
   - New Agent/Composer → paste the task prompt + brief
   - Let it implement → copy the completion report
   - Paste back into Manager for review

## Step 7: Configure Lovable

1. Go back to **Lovable** (app.lovable.dev)
2. **Project Settings → Knowledge**
3. Open `.ai/lovable-knowledge.md` from your local repo
4. Copy everything below the `---` line
5. Paste into the Knowledge field, save

**Test**: Ask Lovable to modify a hook or backend file → should warn it's
outside its domain.

## Step 8: Merge and go

```bash
git checkout main
git merge claude/setup-multi-agent
git push origin main
```

Lovable auto-syncs with main. All three agents are now configured.

## Step 9: Start your first real sprint

```
1. Open Claude Code → describe your next feature
2. Claude Code creates task files in .ai/tasks/
3. Open Cursor Manager Chat → "We need to build [feature]"
4. Manager produces task briefs
5. Run each in a Task Chat
6. Report results to Manager
7. UI tasks → Lovable
8. Claude Code reviews the PR
9. Merge to main
```

---

## Timeline

| Step | Time | What happens |
|------|------|-------------|
| Create project in Lovable | 5-15 min | Lovable generates UI scaffolding |
| Clone + copy starter kit | 2 min | Files in place |
| Claude Code customizes | 5-10 min | Analysis, placeholders filled, cleanup |
| Review output | 3 min | Verify boundaries and config |
| Set up Cursor workforce | 5 min | Manager chat + test task |
| Configure Lovable Knowledge | 2 min | Paste into settings |
| Merge | 1 min | All agents live |
| **Total** | **~25 min** | Ready to build |
