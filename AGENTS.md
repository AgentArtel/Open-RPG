# OpenClaw × RPGJS: AI Agents as Game Characters

AI agents live inside an RPGJS game world as NPC characters — they perceive through game events, act through game commands, and grow by learning new commands through gameplay.

## Tech Stack

- **Game Framework**: RPGJS v4 (TypeScript, ViteJS build, Express + Socket.IO server, PixiJS client)
- **AI / LLM**: Moonshot Kimi K2/K2.5 via `openai` SDK (OpenAI-compatible API). K2 for idle behavior, K2.5 for conversations. Other providers (Anthropic, Google) may be added later via Vercel AI SDK.
- **Deployment**: Railway (game server) + Lovable (frontend wrapper with iframe embed)
- **Agent Architecture**: OpenClaw-inspired patterns (extracted, not imported) — lane queue, perception engine, skill system, memory
- **Language**: TypeScript 5 (strict mode, experimental decorators for RPGJS)
- **Maps**: Tiled Map Editor (.tmx/.tsx files)
- **Runtime**: Node.js 18+

## Commands

```bash
npm install          # install dependencies
rpgjs dev            # dev server (game + client with HMR)
rpgjs build          # production build
npm run lint         # linter
npx tsc --noEmit     # type check
```

## Project Structure

RPGJS v4 uses **autoload by directory convention** — files placed in correctly
named directories auto-register without explicit imports. The module root is
`main/` (referenced in `rpg.toml`).

```
main/                             # RPGJS game module (autoload root)
├── events/                       # Auto-registered NPC/Event classes (@EventData)
├── maps/                         # Auto-registered map classes (@MapData)
├── database/                     # Auto-registered items, weapons, skills
│   └── items/
├── spritesheets/                 # Auto-registered spritesheets (filename = graphic ID)
│   └── npc/
│       ├── male.png              # setGraphic('male')
│       └── spritesheet.ts
├── gui/                          # Auto-registered GUI components (Vue/React)
├── sounds/                       # Auto-registered audio files
├── worlds/                       # World map connections + Tiled assets
│   └── maps/
│       ├── map.tmx               # Tiled map files
│       ├── tileset.tsx           # Tileset definitions
│       └── base.png              # Tileset images
├── player.ts                     # Player lifecycle hooks (onConnected, onJoinMap, etc.)
├── server.ts                     # Server hooks (onStart, auth)
├── client.ts                     # Client hooks (onStart, onConnectError)
├── sprite.ts                     # Client sprite hooks
└── scene-map.ts                  # Scene/camera hooks
src/
├── agents/                       # AI agent system (OpenClaw-inspired)
│   ├── core/                     # AgentRunner, LLM client, lane queue
│   ├── skills/                   # Game command tool definitions (move, look, say, etc.)
│   ├── perception/               # PerceptionEngine — game state → text for LLM
│   ├── memory/                   # Per-agent memory (conversation buffer, persistence)
│   └── bridge/                   # GameChannelAdapter — RPGJS ↔ agent wiring
└── config/                       # Agent personality configs (YAML)
.ai/                              # Multi-agent coordination
.agents/                          # Kimi Overseer config, skills, subagent templates
.github/workflows/                # CI/CD (agent-review, sprint-eval, pre-mortal-merge)
scripts/                          # Automation (git hooks, Kimi CLI, wire daemon)
docs/                             # Architecture docs, ADRs, guides
├── rpgjs-reference/              # RPGJS v4.3.1 source + docs (local reference)
├── openclaw-reference/           # OpenClaw v2026.2.9 source (pattern extraction)
└── rpgjs-guide.md                # Extracted RPGJS cheat sheet
idea/                             # Project vision and research documents
past-configurations/              # Snapshots from prior projects (learning corpus)
rpg.toml                          # RPGJS game configuration
```

> **Why this structure?** RPGJS v4 autoload expects `events/`, `maps/`,
> `spritesheets/`, `database/`, `gui/`, `sounds/` directly under the module
> directory — not nested under `server/` or `client/` subdirectories. The
> `main/` directory follows the same layout as the official sample projects.
> See `docs/rpgjs-guide.md` for full details.

## Agent Team

Three AI agents share this repo. The Human PM is Accountable for all decisions.

### Claude Code — Orchestrator

**Role**: Architecture, task decomposition, code review, coordination.

**Owns**:
- `AGENTS.md`, `CLAUDE.md`, `.ai/` — coordination files
- `docs/` — architecture documentation, ADRs, guides, RPGJS reference
- `idea/` — project vision and research documents
- Root configs: `package.json`, `tsconfig*.json`, `rpg.toml`
- Database schema and agent config schema definitions
- Cross-cutting refactors spanning agent boundaries

**Does**: Breaks requirements into tasks, writes specs to `.ai/tasks/`,
reviews completed work, maintains architectural coherence with idea docs,
handles cross-cutting refactors.

**Does NOT**: Write production game logic, implement agent system internals,
or create map/event implementations.

### Cursor — Implementation Specialist

**Role**: All production code — game server, agent system, bridge layer, UI.

**Owns**:
- `src/agents/**` — entire agent system:
  - `core/` — AgentRunner, LLM client abstraction, lane queue
  - `skills/` — game command tool definitions
  - `perception/` — PerceptionEngine
  - `memory/` — AgentMemory system
  - `bridge/` — GameChannelAdapter, RPGJS integration
- `main/**` — all game module code (RPGJS autoload structure):
  - `events/` — NPC/Event classes (@EventData)
  - `maps/` — map classes (@MapData)
  - `database/` — items, weapons, skills
  - `spritesheets/` — spritesheet definitions + images
  - `gui/` — GUI components
  - `sounds/` — audio assets
  - `worlds/` — Tiled .tmx/.tsx map files and tileset images
  - `player.ts` — player lifecycle hooks
  - `server.ts`, `client.ts` — module hook files
  - `sprite.ts`, `scene-map.ts` — client hook files
- `src/config/` — agent personality config files

**Does**: Implements game logic, agent system, bridge layer, NPC behaviors,
perception engine, skill system, memory, UI components, map design.

**Does NOT**: Modify coordination files (AGENTS.md, CLAUDE.md, .ai/),
change root configs without orchestrator approval, modify idea/ docs.

### Kimi Overseer — CI/Automation Coordinator

**Role**: Automated code review, sprint evaluation, commit routing, multi-agent ops.

**Owns**:
- `.agents/**` — overseer config, subagent templates, skills, prompts
- `.github/workflows/**` — GitHub Actions pipelines
- `scripts/**` — git hooks, automation scripts, wire daemon
- `past-configurations/**` — prior project snapshots (learning corpus)

**Does**: Reviews commits on agent branches, enforces boundary compliance,
manages sprint evaluations, routes commits via post-commit hooks,
maintains automation infrastructure.

**Does NOT**: Write production game code, modify architecture docs (docs/, idea/),
change root configs, or override orchestrator decisions.

## Code Conventions

- TypeScript strict mode — avoid `any`, use `unknown` and narrow
- Functional components for client GUI, classes for RPGJS server entities
- Interfaces before implementations (dependency injection, no hard-coded singletons)
- RPGJS decorators: `@EventData`, `@MapData`, `@RpgModule` for game entities
- Agent configs are declarative (YAML), not hardcoded
- No global mutable state (scaling concern)
- Error handling everywhere — agents must never crash the game server
- Console logging with clear prefixes per agent: `[AgentManager]`, `[Agent:ElderTheron]`, etc.
- All async operations must have error handling
- Perception snapshots target < 300 tokens
- Import path aliases: `@/agents/`, `@/modules/`, `@/config/`

## Git Workflow

```
cursor/feature-name     # Cursor implementation work
claude/feature-name     # Claude Code orchestration / architecture
```

- Branch from `main`, conventional commits
- Commit messages use routing headers: `[AGENT:x] [ACTION:y] [TASK:z] Description`
- PRs require build pass + orchestrator review before merge
- Run `rpgjs build` and `npx tsc --noEmit` before committing
- Kimi Overseer auto-reviews `[ACTION:submit]` commits via GitHub Actions

## Task Coordination

All agents check `.ai/tasks/` for assignments.
See `.ai/templates/task.md` for the task brief format.
See `.ai/boundaries.md` for file-to-agent ownership.
See `.ai/status.md` for current sprint status.

## Key Architecture Decisions

These are documented in the idea/ folder and are the source of truth:

- **Agent thinking model**: Hybrid — event-driven for interactions + 15s idle tick for ambient behavior
- **Perception format**: Structured hybrid (JSON state + brief narrative summary, ~150 tokens)
- **Command execution**: Function calling / tool use (structured commands via OpenAI-compatible API)
- **Agent hosting**: Agent pool within RPGJS server process, one AgentManager for all agents
- **Memory**: In-memory conversation buffer + JSON file persistence per agent (MVP)
- **LLM strategy**: Kimi K2 for idle behavior, Kimi K2.5 for conversations. Automatic context caching (75% savings on repeated context).
- **Deployment**: Railway for RPGJS server, Lovable-built frontend embeds game via iframe
- **RPGJS event hooks**: `onAction` for conversation, `attachShape()` + `onDetectInShape` for proximity, `setInterval` for idle ticks. Never use `onStep` or `onChanges` for agent logic.

## Do

- Run build before committing
- Read existing code before modifying
- Follow patterns in surrounding files
- Handle errors on all async operations
- Reference idea/ docs when making architecture decisions
- Keep perception snapshots under 300 tokens
- Use Shared mode for NPCs (not Scenario mode)

## Don't

- Add dependencies without documenting why
- Import OpenClaw as a dependency (extract patterns only)
- Hard-code agent personalities (use YAML configs)
- Skip error handling — agents must never crash the game server
- Use `onStep` (60 FPS) for agent logic — use timer-based idle ticks
- Use `onChanges` for agent events — creates O(n²) noise
- Commit API keys or secrets
- Add global mutable state
