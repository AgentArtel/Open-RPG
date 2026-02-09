# OpenClaw × RPGJS: AI Agents as Game Characters

AI agents live inside an RPGJS game world as NPC characters — they perceive through game events, act through game commands, and grow by learning new commands through gameplay.

## Tech Stack

- **Game Framework**: RPGJS v4 (TypeScript, ViteJS build, Express + Socket.IO server, PixiJS client)
- **AI / LLM**: Anthropic Claude API via `@anthropic-ai/sdk` (Haiku 4.5 for idle behavior, Sonnet 4.5 for conversations)
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
docs/                             # Architecture docs, ADRs, guides
├── rpgjs-reference/              # RPGJS v4.3.1 source + docs (local reference)
└── rpgjs-guide.md                # Extracted RPGJS cheat sheet
idea/                             # Project vision and research documents
rpg.toml                          # RPGJS game configuration
```

> **Why this structure?** RPGJS v4 autoload expects `events/`, `maps/`,
> `spritesheets/`, `database/`, `gui/`, `sounds/` directly under the module
> directory — not nested under `server/` or `client/` subdirectories. The
> `main/` directory follows the same layout as the official sample projects.
> See `docs/rpgjs-guide.md` for full details.

## Agent Team

Two AI agents share this repo. The Human PM is Accountable for all decisions.

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
- PRs require build pass + orchestrator review before merge
- Run `rpgjs build` and `npx tsc --noEmit` before committing

## Task Coordination

All agents check `.ai/tasks/` for assignments.
See `.ai/templates/task.md` for the task brief format.
See `.ai/boundaries.md` for file-to-agent ownership.
See `.ai/status.md` for current sprint status.

## Key Architecture Decisions

These are documented in the idea/ folder and are the source of truth:

- **Agent thinking model**: Hybrid — event-driven for interactions + 15s idle tick for ambient behavior
- **Perception format**: Structured hybrid (JSON state + brief narrative summary, ~150 tokens)
- **Command execution**: Function calling / tool use (structured commands via Anthropic API)
- **Agent hosting**: Agent pool within RPGJS server process, one AgentManager for all agents
- **Memory**: In-memory conversation buffer + JSON file persistence per agent (MVP)
- **LLM strategy**: Haiku 4.5 for idle behavior, Sonnet 4.5 for conversations. Prompt caching mandatory.
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
