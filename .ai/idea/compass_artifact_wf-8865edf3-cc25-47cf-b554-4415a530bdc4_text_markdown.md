# OpenClaw internals: a pattern extraction guide for game NPC agents

**OpenClaw is a production-grade, open-source AI agent framework** — 100K+ GitHub stars, 175K lines of TypeScript — that routes messages from 15+ chat platforms through a central Gateway to an agentic LLM loop with tool execution, persistent memory, and a modular skills system. The actual repo lives at `github.com/openclaw/openclaw` (not the `nicepkg/openclaw` URL initially provided). Every architectural pattern described below maps directly to what you need for RPGJS NPC agents: the channel adapter pattern becomes your game-world transport, the skills system becomes learnable NPC abilities, and the Markdown-first memory system becomes per-NPC persistent recall of player interactions.

OpenClaw (formerly Clawdbot, then Moltbot) was created by Peter Steinberger in November 2025 and exploded to 60K+ stars in 72 hours after going viral in January 2026. It runs as a single Node.js daemon on your machine, connecting messaging apps to an AI agent that can execute real-world tasks. The architecture is message-router-first: every interaction flows through a Gateway control plane that manages sessions, tools, and events. This report traces the four systems you need to understand for pattern extraction.

---

## 2.1 The six-stage message processing pipeline

Every message in OpenClaw traverses a strict six-stage pipeline, and understanding this flow is the foundation for building your own agent runner.

**Stage 1 — Channel Adapter.** Platform-specific code (grammY for Telegram, Baileys for WhatsApp, discord.js for Discord) normalizes incoming messages into a unified internal format. Each adapter extracts attachments, normalizes sender IDs, and applies access policies (`dmPolicy`, `groupPolicy`, `requireMention`). Key source: `src/telegram/bot.ts`, `src/discord/monitor.ts`, `src/slack/monitor.ts`.

**Stage 2 — Gateway Server.** The Gateway (`src/gateway/server.ts`) is a long-lived Node.js process exposing a **typed WebSocket API** at `ws://127.0.0.1:18789`. It determines which session a message belongs to by constructing a session key in the format **`agent:<agentId>:<channel>:<peer>`** (e.g., `agent:main:telegram:group:123456789`). The wire protocol uses a JSON-RPC-style format with three frame types: `req` (client → Gateway), `res` (Gateway → client), and `event` (server-push). The first frame must be a `connect` request; non-connect first frames trigger hard close. Auth token required when `OPENCLAW_GATEWAY_TOKEN` is set.

**Stage 3 — Lane Queue.** Messages are enqueued via `queueEmbeddedPiMessage` (`src/agents/pi-embedded-runner/runs.ts`). The lane is resolved by `resolveSessionLane` (`src/agents/pi-embedded-runner/lanes.ts`). A session write lock is acquired via `acquireSessionWriteLock` (`src/agents/session-write-lock.ts`). The philosophy is **"default serial, explicit parallel"** — one turn at a time per session to prevent state corruption from concurrent file writes, shell commands, and mutations. Sequential mode (`session`) is the default; concurrent mode (`global`) is opt-in for idempotent tasks only. This is critical for game NPCs where you need deterministic action ordering.

**Stage 4 — Agent Runner.** Entry point: `runEmbeddedPiAgent` (`src/agents/pi-embedded-runner.ts`). This function handles model selection, API key rotation, system prompt assembly (via `buildAgentSystemPrompt` in `src/agents/system-prompt.ts`), tool registry construction (`createOpenClawCodingTools` in `src/agents/pi-tools.ts`), and context window management. The runner wraps **`@mariozechner/pi-agent-core`**, Anthropic's Pi Agent Core library.

**Stage 5 — Agentic Loop.** The Pi Agent Core manages an iterative tool-calling cycle: model proposes a tool call → system executes it → result backfills → loop continues until resolution or limits are hit. Each turn may involve multiple attempts due to failover. Handled by `runEmbeddedAttempt` (`src/agents/pi-embedded-runner/run/attempt.ts`).

**Stage 6 — Response Path.** Final content streams back to the user's channel while simultaneously writing the entire process to a **JSONL transcript** for auditing and replay. Silent turns (prefixed with `NO_REPLY`) suppress delivery to the user.

### LLM abstraction and provider fallback

Models are referenced as **`provider/model-id`** (e.g., `anthropic/claude-opus-4-5`, `openai/gpt-5.2`). The model resolver at `src/agents/model-selection.ts` provides `resolveAgentModelPrimary()` and `resolveAgentModelFallbacksOverride()` with a precedence chain: global defaults → agent-specific overrides → runtime session overrides (via `/model` command). Auth profile rotation (`src/agents/model-auth.ts`) provides a **failover cascade**: primary model attempt → auth profile rotation → fallback model cascade → exhaustion error. Rate-limited API keys are automatically "cooled down" and backup keys/models are used. Context window guards trigger auto-compaction when `contextTokens > contextWindow - reserveTokens` (default floor: **20,000 tokens** reserved).

### Session management details

Sessions use the key format `agent:<agentId>:<channel>:<peer>`. Each key maps to a current `sessionId` (the JSONL transcript file). Sessions auto-reset daily at **4:00 AM local time** by default, or after an idle timeout (`session.reset.idleMinutes`). Decision logic lives in `initSessionState()` at `src/auto-reply/reply/session.ts`. Multi-agent routing uses `agents.list[]` in `openclaw.json` with pattern-matching bindings to route different channels/accounts/peers to isolated agents.

---

## 2.2 Channel adapters are duck-typed plugin objects

OpenClaw does **not** use a formal `interface ChannelAdapter` TypeScript abstract class. Instead, channel plugins are plain objects conforming to a duck-typed structure, registered via `api.registerChannel({ plugin })`. The Plugin SDK exports types from `openclaw/plugin-sdk`.

The minimal channel plugin shape looks like this:

```typescript
const myChannel = {
  id: "rpgjs",                                // unique channel ID
  meta: {
    id: "rpgjs",
    label: "RPGJS Game World",
    selectionLabel: "RPGJS (WebSocket)",
    docsPath: "/channels/rpgjs",
    blurb: "Game world channel for NPC agents.",
    aliases: ["game"],
  },
  capabilities: { chatTypes: ["direct"] },     // "direct", "group", etc.
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.rpgjs?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.rpgjs?.accounts?.[accountId ?? "default"] ?? { accountId },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver response back to the game world
      return { ok: true };
    },
  },
  // Optional adapters: gateway, streaming, actions, security, threading, mentions
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

**All adapters are event-driven, never polling.** Each channel uses its platform's native event mechanism: grammY long-polling for Telegram, Baileys WebSocket for WhatsApp, discord.js WebSocket gateway for Discord. Messages are pushed in via **direct function calls** from the channel's event handler into the Gateway's auto-reply system — built-in channels run in-process with the Gateway. The inbound pipeline flows: Platform SDK → Channel Monitor → Deduplication → Access Policy → Session Key Resolution → `getReplyFromConfig()` → Agent Execution.

Outbound responses flow through `outbound.sendText({ text })` with automatic **text chunking** per platform limits (Telegram: 4096 chars, Discord: 2000, WhatsApp: 4096). Optional `streaming` adapter enables real-time token delivery.

**Multiple adapters absolutely run simultaneously** — this is a core design principle. The Gateway manages all channel connections in a single process. Multi-account support per channel is configured via `channels.<id>.accounts.<accountId>`. Existing adapters span 15+ platforms: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, MS Teams, Matrix, BlueBubbles, Nostr, LINE, Tlon/Urbit, Twitch, Voice Call, Zalo, WebChat, plus community plugins (DingTalk, XMPP, Mattermost, Nextcloud Talk).

Each adapter provides rich metadata: sender ID (platform-specific), chat type (DM/group/thread), channel name, account ID, thread/topic context, media references, message metadata, group history (in-memory ring buffer, default 20 entries), and reaction events.

For your RPGJS adapter, you'd create an extension plugin in `extensions/rpgjs/` with a `gateway.start()` lifecycle hook that establishes a WebSocket client to the RPGJS server, then bridges events bidirectionally through the adapter's inbound/outbound functions. Session keys would map to `agent:main:rpgjs:dm:{playerId}` for individual NPC conversations.

---

## 2.3 Skills are Markdown instructions, not executable code

This is the most surprising architectural insight: **OpenClaw skills are NOT traditional code-based tool definitions with execute functions.** They follow the AgentSkills spec — each skill is a directory containing a `SKILL.md` Markdown file with YAML frontmatter and natural language instructions.

### SKILL.md frontmatter schema

```yaml
---
name: github
description: Use gh CLI for GitHub operations
metadata: {"openclaw": {
  "emoji": "🐙",
  "always": false,
  "os": ["darwin", "linux", "win32"],
  "requires": {
    "bins": ["gh"],              # ALL must exist on PATH
    "anyBins": ["docker", "podman"], # AT LEAST ONE must exist
    "env": ["GITHUB_TOKEN"],     # env var or config-provided
    "config": ["browser.enabled"] # openclaw.json path must be truthy
  },
  "install": [{"id": "brew", "kind": "brew", "formula": "gh", "bins": ["gh"]}]
}}
---
# GitHub CLI Skill
Use when the user needs to interact with GitHub repos, PRs, issues.
## Usage
exec("gh pr list")
exec("gh issue create --title '...' --body '...'")
```

### How the LLM discovers and uses skills

Skills are **injected into the system prompt as compact XML**, not as tool definitions for function calling. The function `formatSkillsForPrompt()` generates:

```xml
<available_skills>
  <skill>
    <name>github</name>
    <description>Use gh CLI for GitHub operations</description>
    <location>~/.openclaw/workspace/skills/github/SKILL.md</location>
  </skill>
</available_skills>
```

The agent receives instructions: "scan `<available_skills>` descriptions. If exactly one skill clearly applies, `read` its SKILL.md, then follow it." The agent then uses the `read` tool to load the full SKILL.md at runtime, and follows its natural-language instructions to invoke actual tools (`exec`, `browser`, `write`, etc.). Token overhead is **~24 tokens per skill** in the system prompt.

### Runtime skill addition — the key pattern for "learn new abilities"

Skills **can be added and removed at runtime** through multiple mechanisms:

- **File-based hot reload**: With `skills.load.watch: true` and `watchDebounceMs: 250`, dropping a SKILL.md file into the skills directory makes it available on the next agent turn without restart. This is your "NPC learning" mechanic — write the file, the ability appears.
- **ClawHub registry**: `clawhub install <skill-slug>` installs from a public registry. An NPC could "visit a trainer" who triggers this.
- **Three-tier precedence**: Workspace skills (highest) > Managed/local skills > Bundled skills (lowest). An NPC can "specialize" a generic skill by creating a workspace-level override.
- **Enable/disable toggles**: `skills.entries.<name>.enabled: true/false` provides instant toggling without file deletion.
- **Conditional prerequisites**: `requires.bins`, `requires.env`, `requires.config` provide natural "level gating" — the NPC can't use a skill until prerequisites are met in the game state.

**Plugin tools** (separate from skills) offer code-based tool registration via `api.registerTool()` with TypeBox schemas and an `execute` function — this is closer to traditional function-calling tools and useful for game-mechanic abilities that need programmatic execution rather than LLM-guided tool chaining.

Error handling is **graceful degradation**: load-time gating excludes skills with missing dependencies; runtime errors from tool execution return as error results through the tool-calling protocol; environment overrides applied via `applySkillEnvOverridesFromSnapshot()` are always restored after the run completes, even on error.

---

## 2.4 Memory is Markdown-first with hybrid retrieval

OpenClaw's memory system is its most distinctive architectural feature and maps perfectly to game NPC memory. It uses a **two-layer Markdown-based system** with hybrid BM25 + vector search.

### The two memory layers

**Daily notes** (`memory/YYYY-MM-DD.md`) are append-only logs of what happened in each session. At session start, the agent reads today's and yesterday's daily notes for continuity. These capture events, decisions, conversation topics — raw and comprehensive.

**Long-term memory** (`MEMORY.md`) is a curated file for durable facts, preferences, and decisions. It's only loaded in the main private session (never in group contexts for privacy). The agent writes to this file when explicitly asked to "remember" something, or automatically during the pre-compaction memory flush.

Both layers are supplemented by **bootstrap files** loaded at every session start: `AGENTS.md` (operating instructions), `IDENTITY.md` (persona), `USER.md` (user preferences), `SOUL.md` (behavioral philosophy), and `TOOLS.md` (tool-specific notes). Bootstrap files are truncated at **20,000 characters** with 70/20 head/tail trimming.

### Hybrid retrieval: BM25 + vector similarity

The `memory_search` tool uses a **union-based hybrid search** combining two methods. Vector similarity uses cosine distance with embeddings stored in SQLite via the `sqlite-vec` extension. BM25 keyword search uses SQLite FTS5 for exact token matching. The fusion strategy retrieves candidate pools from both sides (4x `maxResults` each), normalizes scores, and computes: **`finalScore = 0.7 × vectorScore + 0.3 × textScore`**. If either system fails, the other handles retrieval alone.

Embedding providers are auto-selected in priority order: local `node-llama-cpp` with GGUF models (default: `embeddinggemma-300M-Q8_0.gguf`, ~0.6 GB), OpenAI `text-embedding-3-small`, Gemini `gemini-embedding-001`, Voyage API, or any custom OpenAI-compatible endpoint. Chunking uses a **sliding window of ~400 tokens with ~80-token overlap**.

### Storage formats and locations

| Data | Format | Path |
|------|--------|------|
| Long-term memory | Markdown | `~/.openclaw/workspace/MEMORY.md` |
| Daily notes | Markdown | `~/.openclaw/workspace/memory/YYYY-MM-DD.md` |
| Session transcripts | JSONL | `~/.openclaw/agents/<agentId>/sessions/<id>.jsonl` |
| Vector index | SQLite (sqlite-vec) | `~/.openclaw/memory/<agentId>.sqlite` |
| QMD search index | SQLite | `~/.openclaw/agents/<agentId>/qmd/xdg-cache/qmd/index.sqlite` |
| Configuration | JSON5 | `~/.openclaw/openclaw.json` |

### Custom memory sources for game state injection

Custom memory sources can be injected via `memorySearch.extraPaths` in config (directories scanned recursively for `.md` files) or via the QMD backend's named collections with glob patterns. You can write game state to Markdown files — the file watcher auto-indexes within **1.5 seconds**. Community plugins extend this further: Cognee (knowledge graphs), Mem0 (automatic capture/recall), Graphiti (temporal knowledge graph with Neo4j).

### Per-agent isolation is complete

Each agent gets its own workspace directory, state directory, session store, auth profiles, memory index, and QMD index. Session keys include agent ID, ensuring sessions never cross agents. For game NPCs, each NPC becomes a separate agent with its own `SOUL.md` (personality), `MEMORY.md` (long-term knowledge), and `memory/` directory (daily interaction logs).

### Pre-compaction memory flush — the key innovation

When token usage crosses `contextWindow - reserveTokensFloor - softThresholdTokens` (e.g., **~176K tokens** for a 200K context window), OpenClaw fires a **silent agentic turn** that prompts the model: "Session nearing compaction. Store durable memories now." The agent writes lasting notes to `memory/YYYY-MM-DD.md` before the conversation history gets summarized. This ensures long conversations never lose critical context — a pattern directly applicable to extended NPC interactions.

---

## Project structure at a glance

```
openclaw/
├── src/
│   ├── agents/                  # Core execution engine
│   │   ├── pi-embedded-runner.ts      # runEmbeddedPiAgent entry point
│   │   ├── pi-tools.ts               # createOpenClawCodingTools
│   │   ├── system-prompt.ts           # buildAgentSystemPrompt
│   │   ├── model-selection.ts         # Model resolver + aliases
│   │   ├── model-auth.ts             # Auth rotation + failover
│   │   ├── skills.ts                  # Skill loading + snapshot
│   │   └── session-write-lock.ts      # Lane queue locks
│   ├── gateway/                 # WebSocket control plane
│   │   ├── server.ts
│   │   └── protocol/schema.ts        # TypeBox wire protocol
│   ├── telegram/                # Telegram adapter (grammY)
│   ├── discord/                 # Discord adapter
│   ├── slack/                   # Slack adapter
│   ├── signal/                  # Signal adapter
│   ├── config/                  # Zod-validated config system
│   ├── routing/                 # Session key resolution
│   └── auto-reply/              # Command processing + reply
├── extensions/                  # Plugin channel adapters
│   ├── matrix/, msteams/, bluebubbles/, nostr/, line/, ...
│   └── memory-core/             # Memory extension
├── skills/                      # Bundled SKILL.md files
├── ui/                          # React Control UI
├── docs/                        # Official documentation
└── AGENTS.md                    # AI coding guidelines
```

Runtime state lives under `~/.openclaw/` with per-agent subdirectories for sessions, memory, and workspace files.

---

## Conclusion: what to extract for RPGJS NPC agents

Four patterns from OpenClaw map directly to game NPC architecture. **First**, the Lane Queue's "default serial, explicit parallel" model prevents action conflicts when NPCs process multiple player interactions — implement this as a simple per-NPC async queue. **Second**, the SKILL.md pattern of Markdown-as-ability-definition enables a "learn new skills" mechanic by writing files at runtime with hot reload — far simpler than code-based tool registration for game designers who want to author NPC abilities. **Third**, the two-layer memory system (daily notes + curated long-term memory) with hybrid BM25+vector retrieval gives NPCs both recent recall and semantic search over their full history, stored as human-readable Markdown files that game designers can inspect and edit. **Fourth**, the channel adapter's duck-typed plugin pattern means your RPGJS transport layer needs only `meta`, `capabilities`, `config`, and `outbound.sendText` — roughly 30 lines to scaffold a minimal adapter.

The most non-obvious insight: OpenClaw's skills are **not executable code** — they're natural language instructions that the LLM reads and follows using existing tools. This means your NPC "abilities" can be authored as plain Markdown documents describing when and how to use game-world APIs, rather than requiring TypeScript tool definitions for every new ability. Combined with the pre-compaction memory flush that preserves context before summarization, this architecture gives NPCs genuinely persistent, human-auditable memories across arbitrarily long player interactions.