# Agent Artel reference UI

This folder is the **Agent Artel reference UI / canvas prototype**: 8 pages, 150+ components, and a full n8n-style workflow editor (dashboard, workflow list, execution history, credentials, settings, agent library, workflow editor with canvas and nodes).

## Run it

```bash
npm install
npm run dev
```

## Integrate (Lovable)

Import components or pages into your main app via a path alias (e.g. `@reference` → `./reference-app/src`) or by copying what you need into your `src/`. Wire them to your backend and routes. **Do not rebuild from scratch** — use this as the source for the interactive canvas and shell.

## Design system

See **AGENT_STORM_PLAN.md** in this folder for colors, typography, effects, and component assignments.

## Updates

Kimi Agent develops components in the Open-Agency-Artel repo. A sync script pushes updates from there into Agent-Artel-studio so this folder stays in sync with the canonical reference.
