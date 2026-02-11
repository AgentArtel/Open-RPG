---
name: learn-from-past
description: Study past project configurations before starting new projects. Extract lessons from successes and failures, compare current project structure to past ones, and apply proven patterns while avoiding known anti-patterns.
---

## When to Use This Skill

Activate this skill during:

1. **Project Bootstrap** — Before Phase 1 of the Bootstrap Playbook
2. **Major Feature Planning** — When decomposing a large feature into phases
3. **Sprint Planning** — When structuring a new sprint with multiple tasks
4. **Post-Mortem** — After a sprint to contribute lessons back

## What to Study

Past configurations live in `past-configurations/` in the Open Artel Project Setup repo. Each subdirectory is a snapshot from a real project.

### Key Files to Read

| File | What It Tells You |
|------|-------------------|
| `status.md` | Sprint structure, phases, what completed vs what stalled |
| `boundaries.md` | File ownership patterns — which mappings worked cleanly |
| `tasks/TASK-*.md` | Task format, sizing, acceptance criteria quality |
| `project-vision/README.md` | How architecture was documented and communicated |
| `CURSOR_WORKFORCE.md` | Workforce protocol — manager/task chat patterns |
| `walkthroughs/` | Step-by-step setup guides that were written for real use |
| `templates/` | Templates that evolved from actual project needs |

### Reading the Index

Start with `past-configurations/INDEX.md` for a catalog of available configurations with metadata (project type, phases, task count, key files, when to reference).

## How to Extract Patterns

### Step 1: Run the Extraction Script

```bash
./scripts/extract-past-lessons.sh <config-name>
# Example: ./scripts/extract-past-lessons.sh Even-Openclaw
# Output: .ai/lessons/<config-name>-lessons.md
```

### Step 2: Review the Output

The script analyzes the past configuration and produces a structured lessons file with three categories:

1. **Successful Patterns** — What worked well, with evidence
2. **Failed Patterns** — What caused problems, with evidence
3. **Anti-Patterns** — What to avoid, with evidence

### Step 3: Manual Review

The script provides a starting point. Review the output and refine based on your own reading of the past configuration files. Pay special attention to:

- Tasks that went through multiple review cycles (sign of unclear specs)
- Tasks marked PARTIAL or BLOCKED (sign of dependency issues)
- Escalation tasks (sign of scope or communication problems)
- Phase transitions (what made them smooth or rough)

## How to Compare Structures

### Step 1: Run the Comparison Script

```bash
./scripts/compare-project-structure.sh <config-name>
# Example: ./scripts/compare-project-structure.sh Even-Openclaw
# Output: .ai/reports/structure-comparison-<config-name>.md
```

### Step 2: Review Similarities and Differences

The script compares your current project against the past configuration across:

- **Agent roles** — Same three-agent model or different?
- **File ownership** — Similar directory structure?
- **Task format** — Same template, same fields?
- **Sprint structure** — Phased approach? How many phases?
- **Coordination layer** — Same `.ai/` structure?

### Step 3: Identify Adaptations

For each difference, decide:

- **Adopt**: The past pattern is better — use it
- **Adapt**: The past pattern is close — modify it for your context
- **Skip**: The past pattern doesn't apply to your project

## How to Apply Lessons

### During Bootstrap

1. Read the lessons file before customizing the starter kit
2. Apply successful patterns to your project structure
3. Avoid failed patterns in your task decomposition
4. Document what you applied in `.ai/lessons/applied-lessons.md`

### During Sprint Planning

1. Check `.ai/lessons/applied-lessons.md` for relevant patterns
2. When decomposing tasks, reference past task sizes that worked
3. When setting acceptance criteria, use past criteria as templates
4. When defining dependencies, check for circular dependency anti-patterns

### During Task Assignment

1. Match task complexity to what worked in past projects
2. Use the same handoff format that produced clean reviews
3. Include the same level of specification detail
4. Reference past tasks as examples in new task briefs

## How to Document

### Track Applied Lessons

Maintain `.ai/lessons/applied-lessons.md` with:

- Which past config was studied
- Which patterns were applied
- Which patterns were avoided
- Results after implementation (fill in after the sprint)

### Contribute Back

After a sprint, update the lessons:

1. Did the applied patterns work? Update the "Result" field
2. Did you discover new patterns? Add them to the pattern library
3. Did a pattern fail in your context? Document why

## Pattern Library

Reusable patterns extracted from past configurations are stored in `.ai/patterns/from-past-configs/`. Each pattern file documents:

- **Source** — Which past configuration it came from
- **Category** — Structure, Process, Task, or Review
- **Evidence** — Why it worked or didn't
- **When to Use** — Conditions where this pattern applies
- **How to Apply** — Step-by-step instructions

## Grounding Rule

All lessons and patterns must be grounded in reality — backed by evidence from actual project data. Never assume a pattern worked or failed without checking the source files. When in doubt, read the original task files, status updates, and review feedback.

