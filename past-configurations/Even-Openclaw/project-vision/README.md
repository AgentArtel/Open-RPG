# ClawLens: Even G1 × OpenClaw Agent Hub

## Project Vision

**One sentence:** Turn Even G1 smart glasses into the primary wearable interface for a fleet of autonomous OpenClaw AI agents, with a custom Lovable-built web dashboard for deep configuration of both the glasses and the agents.

**Why this works:** OpenClaw’s entire architecture is built around messaging channels as the agent interface layer. The Even G1 Demo App is an open-source Flutter app that already handles the full BLE pipeline: voice capture → STT → LLM → text display on the glasses. The architectural gap between “messaging platform” and “smart glasses companion app” is surprisingly small. You’re not building a new glasses OS — you’re building a new OpenClaw channel plugin that speaks BLE.

-----

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   LOVABLE WEB DASHBOARD               │
│  (React frontend — agent config, glasses config,      │
│   skill management, conversation logs, display prefs)  │
└──────────────┬───────────────────────┬────────────────┘
               │ REST/WebSocket API    │
               ▼                       ▼
┌──────────────────────────────────────────────────────┐
│     HOME SERVER / DOCKER HOST (Mac Mini, Pi, VPS)     │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │         OPENCLAW GATEWAY (Containerized)          │ │
│  │                                                    │ │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────────────────┐│ │
│  │  │Telegram │ │WhatsApp │ │ EVEN G1 CHANNEL PLUGIN││ │
│  │  │ Channel │ │ Channel │ │ (@openclaw/eveng1)    ││ │
│  │  └─────────┘ └─────────┘ └──────────┬───────────┘│ │
│  │                                      │            │ │
│  │  ┌──────────────────────────────────┐│            │ │
│  │  │ Agent Runtime (Skills, Memory,   ││            │ │
│  │  │ Heartbeat, Cron Jobs, Tools)     ││            │ │
│  │  └──────────────────────────────────┘│            │ │
│  └──────────────────────────────────────┘            │ │
└────────────────────────────────────────┬─────────────┘
                                         │ WebSocket
                                         │ (local network when home,
                                         │  Tailscale/WireGuard when remote)
                                         ▼
┌──────────────────────────────────────────────────────┐
│      SAMSUNG GALAXY S24 (DEDICATED EDGE DEVICE)       │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  MODIFIED EVEN DEMO APP (Flutter)               │  │
│  │                                                  │  │
│  │  ┌───────────────┐  ┌─────────────────────────┐ │  │
│  │  │ BLE Manager   │  │ OpenClaw Bridge Service │ │  │
│  │  │ (Dual BLE to  │  │ (WebSocket client that  │ │  │
│  │  │  G1 glasses)  │  │  talks to OpenClaw)     │ │  │
│  │  └───────┬───────┘  └──────────┬──────────────┘ │  │
│  │          │                     │                 │  │
│  │  ┌───────┴─────────────────────┴──────────────┐  │  │
│  │  │ Message Router                              │  │
│  │  │ - Voice input → STT → OpenClaw              │  │
│  │  │ - OpenClaw response → text formatting       │  │
│  │  │   → BLE send                                │  │
│  │  │ - TouchBar events → agent commands          │  │
│  │  │ - Notification routing from agents          │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ON-DEVICE STT                                  │  │
│  │  - Android's built-in speech recognition (P1)   │  │
│  │  - Whisper via whisper.cpp / Galaxy AI (P4+)    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  CONNECTIVITY                                   │  │
│  │  - WiFi to home server (low latency)            │  │
│  │  - Cellular data (always-on via Tailscale)      │  │
│  │  - Persistent WebSocket to OpenClaw gateway     │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────┘
                           │ Dual BLE (0x4E text, 0x15 BMP, 0xF1 mic)
                           ▼
                    ┌──────────────┐
                    │  EVEN G1     │
                    │  GLASSES     │
                    └──────────────┘
```

-----

## Edge Device: Samsung Galaxy S24 (Dedicated)

**Device:** Samsung Galaxy S24 (SM-S921U) — dedicated to the ClawLens project, not a daily driver.

| Spec | Value |
|------|-------|
| Model | SM-S921U |
| SoC | Snapdragon 8 Gen 3 |
| RAM | 8GB |
| NPU | ~50-60 tokens/sec (small models) |
| BLE | 5.3 |
| On-device AI | Galaxy AI (Samsung) |

The **Galaxy S24** serves as the dedicated bridge device between the Even G1 glasses and the OpenClaw agent runtime. Since this is a dedicated device (not a daily driver), we get: always-on bridge service, no resource contention with other apps, predictable battery life, and the ability to run background inference without impacting user experience.

**Connection Flow:**

- **Even G1 Glasses** connect to the **Modified Even Demo App** on the **Galaxy S24** via dual BLE connections
- The app captures voice from the glasses, transcribes it on-device, and sends the text to the OpenClaw gateway over WebSocket
- Agent responses flow back through the same path: OpenClaw → WebSocket → phone app → BLE → glasses display

### Phase 1-3: Thin Bridge Architecture

For the initial build, the Galaxy S24 acts as a **thin bridge** — it handles three things:

1. **BLE communication** with the G1 glasses (voice capture, text display, gesture input)
1. **Speech-to-text** using Android's built-in speech recognition API (zero setup, good quality, works offline for short commands)
1. **WebSocket relay** to the OpenClaw gateway for all agent interactions

All LLM inference, agent orchestration, skill execution, and intelligence happens server-side in the OpenClaw container. This keeps the Flutter app simple and the codebase minimal.

### Phase 2+: Three-Tier Compute Architecture

ClawLens uses a **three-tier agent architecture** where each agent has a lite, standard, and advanced version distributed across compute tiers:

```
┌─────────────────────────────────────────────────────────┐
│  TIER 3: CLOUD APIs (Frontier Models)                   │
│  Gemini, Kimi K2 (Moonshot AI), Claude, GPT-4           │
│  Complex reasoning, long context, multi-step tasks      │
│  Latency: 1-5s │ Cost: per-token │ Requires internet    │
└──────────────────────────┬──────────────────────────────┘
                           │ API calls (when needed)
┌──────────────────────────┴──────────────────────────────┐
│  TIER 2: MAC MINI (Local Server / OpenClaw Gateway)     │
│  Llama 3.x, Mistral, Qwen, local fine-tunes via Ollama │
│  Most agent work: memory, skills, cron jobs, tools      │
│  Latency: 0.5-2s │ Cost: electricity │ Home network     │
└──────────────────────────┬──────────────────────────────┘
                           │ WebSocket (local/Tailscale)
┌──────────────────────────┴──────────────────────────────┐
│  TIER 1: GALAXY S24 (Mobile Edge)                       │
│  Gemma 2B, on-device Whisper, response cache            │
│  Quick responses, offline fallback, STT, query triage   │
│  Latency: 0.3-1s │ Cost: battery │ Always available     │
└──────────────────────────┬──────────────────────────────┘
                           │ BLE
                      ┌────┴────┐
                      │ EVEN G1 │
                      └─────────┘
```

**How routing works:**

1. Voice comes in → on-device STT transcribes (always Tier 1)
2. **Query classifier** (tiny model on phone) evaluates complexity:
   - Simple/cached → handle locally on Tier 1 (Gemma 2B)
   - Medium complexity → route to Mac Mini via OpenClaw (Tier 2)
   - Needs frontier reasoning or huge context → route to cloud API (Tier 3)
3. If Mac Mini unreachable → try cloud fallback
4. If all remote unreachable → degrade gracefully to Tier 1 with "lite mode" indicator on glasses

**Agent capability by tier:**

| Capability | Tier 1 (S24) | Tier 2 (Mac Mini) | Tier 3 (Cloud) |
|-----------|-------------|-------------------|----------------|
| Simple Q&A | Gemma 2B | Llama 70B+ | — |
| Task status | Local cache | OpenClaw runtime | — |
| Research | — | Local + tools | Kimi K2 (1M ctx) |
| Code generation | — | — | Claude / Gemini |
| STT | On-device Whisper | — | — |
| Summarization | Gemma 2B | Llama 70B+ | — |
| Morning briefing | — | OpenClaw cron | — |
| Offline fallback | Cache + small LLM | — | — |

**S24-specific considerations (8GB RAM):**

- Gemma 2B is the sweet spot for on-device inference — fits comfortably alongside Flutter app and BLE stack
- Phi-3-mini (3.8B) may be too tight on 8GB with concurrent BLE + WebSocket
- Whisper tiny/base models work well — don't use Whisper large
- Thermal management critical — sustained NPU inference needs cooldown policy (e.g., max 10 queries before throttling)
- Dedicated device = can keep models loaded in memory, no app eviction

**Implementation phasing:**

- **Phase 1:** Thin bridge only — STT + WebSocket relay
- **Phase 2:** Add QueryRouter skeleton and response cache (infrastructure ready, routes everything to Tier 2)
- **Phase 3:** Enable Tier 1 inference (Gemma 2B for simple queries, on-device Whisper replacing Android STT)
- **Phase 4:** Full three-tier routing with complexity classification, Tier 3 cloud APIs (Gemini, Kimi K2), thermal management, offline mode

**Running Whisper/LLMs from Flutter:**

- Requires native Android platform channels (Kotlin/Java → MediaPipe LLM Inference API or Qualcomm AI Hub SDK)
- Non-trivial but well-documented path
- On-device STT ~1-3 seconds, small LLM ~1-2 seconds — benefit is eliminating network latency, not instant responses
- Battery and thermal monitoring essential

**Connectivity:**

- **WiFi to home server:** Low-latency connection when at home
- **Cellular data with Tailscale/WireGuard tunnel:** Maintains secure connection to the home server's OpenClaw gateway when away from WiFi
- **Always-on WebSocket:** The app maintains a persistent connection regardless of network type, with automatic reconnection on drops
- **Offline mode (Phase 3+):** Tier 1 handles queries locally when all remote connections fail

-----

## The Three Build Targets

### 1. Custom OpenClaw Channel Plugin (`@openclaw/eveng1`)

This is the core integration piece. OpenClaw’s plugin architecture supports custom channels that follow a standard interface: receive messages in, send messages out, handle session routing.

**What the plugin does:**

- Exposes a local HTTP/WebSocket endpoint that the modified Even app connects to
- Receives transcribed voice input from the glasses as inbound messages
- Sends agent responses back, pre-formatted for the G1’s display constraints (488px width, 5 lines per screen, ~21px font)
- Handles session management (the glasses are always “you” — single-user channel)
- Routes TouchBar gestures as agent commands (single tap = next page, double tap = dismiss, long press = new query)
- Supports proactive agent messages (heartbeat notifications, cron job results) pushed to the glasses display

**Key technical decisions:**

- **Transport:** WebSocket between the Flutter app and OpenClaw gateway (low latency, bidirectional, persistent)
- **Message format:** OpenClaw’s standard message interface with G1-specific metadata (display mode, page count, urgency level)
- **STT:** Handle speech-to-text on the Galaxy S24. **Phase 1:** Use Android’s built-in speech recognition API (zero setup, works offline). **Phase 4+:** Optionally upgrade to on-device Whisper or Deepgram API for higher accuracy
- **Display formatting:** The channel plugin should handle text wrapping and pagination server-side, since it knows the G1’s constraints. Send pre-paginated screens to the Flutter app

**Plugin structure:**

```
extensions/eveng1/
├── package.json          # OpenClaw plugin manifest
├── index.ts              # Entry point, channel registration
├── config-schema.ts      # Configuration (port, display prefs, etc.)
├── eveng1-channel.ts     # Channel adapter implementation
├── display-formatter.ts  # G1-aware text pagination engine
└── gesture-mapper.ts     # TouchBar → agent command mapping
```

### 2. Modified Even Demo App (Flutter) — Running on Samsung Galaxy S24

Fork the EvenDemoApp and add an OpenClaw bridge service alongside the existing BLE manager. The app runs on a **Samsung Galaxy S24**, which serves as the bridge between the glasses and the agent runtime.

**Connection Architecture:**

- The **Even G1 glasses connect to this app** via dual BLE connections (0x4E for text, 0x15 for BMP images, 0xF1 for microphone audio)
- The app acts as the bridge between the glasses hardware and the OpenClaw agent system
- All voice input is captured by the app, transcribed on-device, and sent to OpenClaw via WebSocket. Responses flow back the same path

**What changes from the stock Demo App:**

- **New: OpenClaw Bridge Service** — A background service that maintains a WebSocket connection to the OpenClaw gateway (on the home server). Routes all voice input through OpenClaw instead of a single LLM API call
- **New: Agent Notification Display** — When OpenClaw agents proactively send messages (heartbeat updates, task completions, alerts), format and push them to the glasses using the 0x4E text protocol
- **New: Multi-agent routing** — TouchBar gestures mapped to switch between active agent contexts (e.g., triple tap to cycle between your coding agent, research agent, and personal assistant)
- **New: Quick command vocabulary** — Pre-defined short voice commands that map to agent actions (“Status” → agent dashboard summary, “Tasks” → todo list, “Brief me” → morning briefing)
- **Enhanced: STT pipeline** — Phase 1 uses Android’s built-in speech recognition. Phase 4+ can optionally add on-device Whisper via platform channels for improved accuracy and privacy
- **Enhanced: Display modes** — Support different display layouts per agent type (compact notification, full-page response, scrolling ticker for live updates)
- **Preserved: All existing BLE protocol handling** — The dual BLE management, LC3 audio capture, text/BMP sending protocols all stay intact

**Key G1 hardware constraints to design around:**

|Constraint      |Value                                |Design Implication                         |
|----------------|-------------------------------------|-------------------------------------------|
|Display width   |488px (AI mode) / 576px (BMP)        |Responses must be concise                  |
|Lines per screen|5                                    |Paginate all agent responses               |
|Font size       |~21px default                        |~25 characters per line                    |
|Max recording   |30 seconds                           |Voice commands must be brief               |
|Image format    |1-bit BMP, 576×136px                 |Agent-generated visuals are monochrome only|
|Battery         |~1.5 days                            |Minimize BLE polling frequency             |
|TouchBar inputs |Single/double/triple tap + long press|Limited gesture vocabulary                 |

### 3. Lovable Web Dashboard

A React-based web frontend (built with Lovable for rapid iteration) that serves as the central command center for both the glasses and agents.

**Dashboard sections:**

**Agent Management**

- View all active OpenClaw agents and their status
- Configure agent skills, memory, and personality per agent
- Set which agents can push notifications to the glasses vs. only respond when queried
- Priority routing rules (which agent responds to which type of query)
- Conversation history with full logs (searchable)

**Glasses Configuration**

- Display preferences: font size, lines per screen, auto-scroll speed, brightness keywords
- Notification rules: which agent messages appear on glasses, quiet hours, urgency thresholds
- TouchBar gesture mapping editor (customize what each gesture does)
- Voice command vocabulary editor (add custom quick commands)
- Display layout templates per agent type

**Agent Studio**

- Create and edit OpenClaw SKILL.md files visually
- Test agent responses with a preview that simulates the G1 display constraints
- Import skills from ClawHub with one click
- Chain agents together (e.g., research agent feeds into writing agent)

**Live Monitor**

- Real-time view of what’s currently on the glasses display
- Live agent activity feed
- BLE connection status and battery level
- Message queue (pending agent notifications waiting to display)

**Technical stack for Lovable build:**

- React + Tailwind (Lovable’s native stack)
- Connects to OpenClaw gateway via REST API for agent management
- WebSocket for real-time status updates
- Supabase for user settings persistence and conversation log storage (Lovable integrates natively)
- Could optionally add auth to share dashboard access across devices

-----

## Implementation Roadmap

### Phase 1: Proof of Concept (1-2 weeks)

**Goal:** Voice command on G1 → OpenClaw agent responds → text appears on glasses

- Fork EvenDemoApp
- Build minimal WebSocket bridge in Flutter that connects to OpenClaw’s gateway
- Create barebones `@openclaw/eveng1` channel plugin (receive text, send text)
- Wire up existing LC3 audio → Android speech recognition → OpenClaw → text response → G1 display
- Test with a single agent (personal assistant)

**Success criteria:** You can long-press the G1 TouchBar, ask a question, and get an OpenClaw agent’s response displayed on the glasses within 5 seconds

### Phase 2: Multi-Agent + Gestures (2-3 weeks)

**Goal:** Multiple agents accessible from the glasses with gesture-based navigation

- Implement agent context switching via TouchBar gestures
- Add proactive notification support (agents can push to glasses)
- Build the display formatter for proper pagination and different display modes
- Add quick command vocabulary (“Status”, “Tasks”, “Brief me”)
- Implement notification queuing (agents don’t interrupt each other)

**Success criteria:** You can switch between 3+ agents from the glasses, receive proactive notifications, and use quick commands

### Phase 3: Lovable Dashboard MVP (2-3 weeks)

**Goal:** Web-based control center for glasses + agent configuration

- Build core Lovable app with Supabase backend
- Agent management panel (list, configure, toggle glasses access)
- Glasses config panel (display prefs, gesture mapping)
- Real-time monitor (what’s on the glasses now, agent activity feed)
- Connect to OpenClaw gateway API

**Success criteria:** You can configure agent behavior and glasses display preferences from a web browser, and changes take effect immediately on the glasses

### Phase 4: Three-Tier Compute + Agent Studio + Polish (2-4 weeks)

**Goal:** Full three-tier agent architecture, skill editing, G1 display preview, and production polish

- Enable Tier 1 edge inference on Galaxy S24 (Gemma 2B via MediaPipe, on-device Whisper via platform channels)
- Tier 3 cloud API integration (Gemini, Kimi K2 from Moonshot AI, Claude) for frontier-model queries
- Query complexity classifier for automatic tier routing
- Thermal management and battery monitoring for sustained edge inference
- Offline mode — Tier 1 handles queries when all remote connections fail
- Visual SKILL.md editor in the dashboard
- G1 display simulator (preview how agent responses will look on the glasses)
- ClawHub skill browser integration
- Agent chaining/workflow builder
- BMP image support for agent-generated visual content (charts, diagrams in monochrome)
- Response cache on phone for frequently asked queries

-----

## Competitive Differentiation

**What exists today:**

- Even G1’s stock app routes to a single LLM (ChatGPT or Perplexity) with no persistent memory and no proactive capabilities
- OpenClaw connects to phones via Telegram/WhatsApp but has no wearable display layer
- MentraOS offers an app platform for smart glasses but isn’t agent-native

**What ClawLens creates:**

- **Persistent agent memory on your face** — OpenClaw remembers everything across sessions, and the glasses are your always-on viewport into that memory
- **Multi-agent wearable orchestration** — Not one assistant, but a team of specialized agents all accessible through a single wearable interface
- **Proactive intelligence delivery** — Agents don’t just respond, they push relevant information to your glasses based on context, schedule, and learned patterns
- **Open architecture** — Both OpenClaw and the Even Demo App are open source. Anyone can extend the channel plugin, add new agents, or build custom dashboard modules
- **Web + Mobile + Wearable unified config** — One dashboard to rule them all, rather than being locked into the mobile app for glasses config

-----

## Risk Assessment & Mitigations

**BLE latency / reliability**

- Risk: Dual BLE connection drops, high latency for agent responses
- Mitigation: Implement connection watchdog, queue responses during disconnects, show “thinking…” indicator on glasses during processing

**OpenClaw security concerns**

- Risk: OpenClaw is flagged for security issues (exposed API keys, prompt injection)
- Mitigation: Run in isolated Docker container on dedicated hardware. See Security Isolation section below

**G1 display limitations**

- Risk: 488px × 5 lines is very constrained for rich agent output
- Mitigation: Build smart summarization into the display formatter — agents generate full responses, the formatter creates glasses-optimized summaries with “read more” pagination. Use BMP mode for structured data (mini charts, tables)

**Battery drain from persistent BLE + WebSocket**

- Risk: Constant agent connection drains G1 faster
- Mitigation: Implement smart polling (reduce frequency when idle), batch notifications, support “glasses sleep” mode where agents queue but don’t push

**Agent containment / isolation**

- Risk: OpenClaw agents have shell access, browser automation, and file system access by design — a compromised or misbehaving agent on your daily driver machine is a real threat
- Mitigation: **Run OpenClaw in an isolated Docker container or on dedicated hardware.** See the Security Isolation section below for the full setup rationale

**Flutter + Node.js integration complexity**

- Risk: Maintaining a forked Flutter app plus a Node.js plugin is two codebases
- Mitigation: Keep the Flutter modifications minimal (bridge service only), handle all intelligence in the OpenClaw plugin. The Flutter app should be a thin BLE ↔ WebSocket bridge. Edge AI capabilities (Phase 4+) will increase complexity — plan accordingly

**Remote connectivity reliability**

- Risk: When away from home WiFi, the WebSocket connection to the OpenClaw gateway depends on Tailscale/WireGuard tunnel stability
- Mitigation: Implement aggressive reconnection logic in the Flutter app, queue voice commands locally during disconnects, and display connection status on the glasses. Phase 4 on-device STT/LLM provides offline fallback for basic queries

-----

## Security Isolation: Containerized Agent Runtime

This is non-negotiable. OpenClaw agents can execute shell commands, manage files, and automate browsers. The security track record is still maturing (341 malicious skills found out of 2,857 in a recent audit, Moltbook hacked in under 3 minutes exposing millions of API tokens). Running this on your primary machine with access to your real accounts is reckless.

### Recommended: OpenClaw’s Official Docker Deployment + Hardening

OpenClaw ships with built-in Docker support via `docker-setup.sh`, which handles image building, onboarding, gateway token generation, and Docker Compose configuration. Use the official setup as the foundation, then layer on ClawLens-specific customizations and security hardening.

**Step 1: Use OpenClaw’s official Docker setup**

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
./docker-setup.sh
```

This creates:

- `~/.openclaw` — Configuration, memory, API keys, agent settings
- `~/openclaw/workspace` — Agent-accessible working directory
- A Docker Compose setup with the gateway and CLI containers

**Step 2: Add ClawLens customizations to docker-compose.yml**

```yaml
# Add these modifications to the generated docker-compose.yml:
services:
  openclaw-gateway:
    # --- Security hardening (add these) ---
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          memory: 1G
    tmpfs:
      - /tmp:size=512M

    # --- ClawLens additions (add these) ---
    volumes:
      # Add the eveng1 channel plugin (alongside existing volume mounts)
      - ./extensions/eveng1:/app/extensions/eveng1
    ports:
      # OpenClaw's default gateway port (localhost-bound for security)
      - "127.0.0.1:18789:18789"
```

**Step 3: Enable agent sandbox isolation**

OpenClaw has built-in per-agent sandbox isolation — each agent’s tool execution (shell commands, file access, browser automation) runs in its own Docker container. Enable this in `openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "enabled": true,
        "scope": "agent"
      }
    }
  }
}
```

With `scope: "agent"`, each agent gets its own isolated container and workspace. This means a compromised coding agent can’t access your personal assistant agent’s memory or files.

### Isolation Principles

**What goes INSIDE the container:**

- OpenClaw gateway + agent runtime
- The `@openclaw/eveng1` channel plugin
- Agent skills and memory storage
- LLM API keys (stored in container’s keychain, not your host)

**What stays OUTSIDE the container:**

- Your personal files, email, calendar, browser sessions
- The Flutter glasses app (runs on your Galaxy S24, connects to the container’s WebSocket port)
- The Lovable dashboard (connects to the container’s gateway API)
- SSH keys, cloud credentials, anything sensitive

**Network restrictions:**

- Bind ports to `127.0.0.1` only — no external access to the agent runtime
- If you need remote access (e.g., glasses connecting while away from home), use a Tailscale or WireGuard tunnel instead of exposing ports
- Consider an egress proxy to restrict which domains agents can reach (block everything except LLM API endpoints, your chosen STT provider, and specific skill-required domains)

**Skill vetting:**

- Never install skills from ClawHub without reading the SKILL.md first
- Mount community skills as read-only volumes
- Use OpenClaw’s skill allowlist/denylist to restrict what agents can use
- Your custom skills for glasses integration should live in a separate, auditable directory

### Alternative: Dedicated Hardware

If Docker feels insufficient or you want physical isolation:

- **Mac Mini** — The community favorite. Dedicated machine running OpenClaw 24/7, no personal data on it. ~$500-600 for an M2 Mini
- **Raspberry Pi 5** — Budget option. Runs OpenClaw fine for personal use. ~$80-100. Network-isolate it on its own VLAN if your router supports it
- **DigitalOcean 1-Click Deploy** — They offer a hardened OpenClaw image with Docker isolation, non-root execution, and firewall rules out of the box. Starts at ~$6/mo for a basic droplet. Adds latency but maximum isolation from your personal devices
- **Old laptop** — Wipe it, install Ubuntu, run OpenClaw in Docker on it. Free if you have spare hardware

### What NOT to Do

- Don’t run OpenClaw on your daily driver laptop with access to your real email/calendar/files
- Don’t give agents your primary cloud credentials (create dedicated service accounts)
- Don’t install unvetted skills from random GitHub repos or ClawHub without review
- Don’t expose OpenClaw’s ports to the public internet without a VPN/tunnel layer
- Don’t skip resource limits — a looping agent can eat 100% CPU and drain your battery

-----

## Open Questions to Resolve

1. **Agent selection UX:** How do you pick which agent to talk to from the glasses? Options: voice prefix (“Hey Research, find me…”), gesture-based cycling, auto-routing based on query content, or a “dispatcher” agent that routes?
1. **Even G2 compatibility:** Even G2 is coming with better optics and an R1 ring controller. Should the architecture account for G2 from the start, or build for G1 now and adapt later?
1. **Dashboard hosting:** Self-hosted alongside OpenClaw, or deployed to Vercel/Netlify for access from anywhere? Tradeoff between privacy and convenience.
1. **Monetization angle:** Is this a personal tool only, or could this become an Artelio product/service? The “AI ethics consulting firm builds the reference implementation for ethical wearable AI agents” narrative is compelling.
1. **MentraOS compatibility:** MentraOS already supports Even G1 with a TypeScript SDK. Is it better to build the channel plugin as a MentraOS MiniApp instead of forking the Demo App directly? This could give you cross-glasses compatibility for free.
1. **~~Galaxy S24 role:~~** ✅ RESOLVED — Dedicated Samsung Galaxy S24 (SM-S921U, 8GB RAM, Snapdragon 8 Gen 3). Always-on bridge service, no resource contention.
1. **Three-tier compute investment:** The Gemma 2B + Whisper edge layer (Tier 1), local OpenClaw models (Tier 2), and cloud APIs like Kimi K2/Gemini (Tier 3) add significant complexity. Phase 1-2 uses thin bridge only; Tier 1 edge inference arrives Phase 3-4. Worth it for offline capability and reduced latency.

-----

## Tech Stack Summary

|Component                 |Technology                                  |Why                                                  |
|--------------------------|--------------------------------------------|-----------------------------------------------------|
|Edge Device (Tier 1)      |Samsung Galaxy S24 (SM-S921U, dedicated)    |BLE bridge, on-device STT, edge inference, always-on |
|Local Server (Tier 2)     |Mac Mini / Pi 5 running OpenClaw            |Primary agent runtime, local models, memory, skills  |
|Cloud APIs (Tier 3)       |Gemini, Kimi K2 (Moonshot), Claude, GPT-4   |Frontier models for complex reasoning, long context  |
|OpenClaw Channel Plugin   |TypeScript / Node.js                        |Native to OpenClaw's plugin system                   |
|Modified Glasses App      |Flutter / Dart                              |Fork of Even's official Demo App, runs on Galaxy S24 |
|Web Dashboard             |React + Tailwind + Supabase                 |Built with Lovable for rapid iteration               |
|STT (Phase 1)             |Android Speech Recognition API              |Zero setup, works offline, good quality              |
|STT (Phase 3+)            |On-device Whisper via MediaPipe             |Higher accuracy, better privacy (requires native dev)|
|LLM (Tier 1 Edge)         |Gemma 2B via MediaPipe / Qualcomm AI Hub    |Fast simple queries, offline fallback                |
|LLM (Tier 2 Local)        |Llama 3.x, Mistral, Qwen via Ollama        |Most agent work, no API costs                        |
|LLM (Tier 3 Cloud)        |Kimi K2, Gemini, Claude via APIs            |Complex reasoning, 1M+ context, multi-step tasks    |
|Transport (App ↔ OpenClaw)|WebSocket                                   |Low latency, bidirectional, persistent               |
|Transport (App ↔ Glasses) |BLE (dual connection)                       |G1 hardware requirement                              |
|Secure Remote Access      |Tailscale / WireGuard                       |Encrypted tunnel for cellular connectivity           |
|Agent Runtime             |OpenClaw Gateway (Dockerized)               |Handles memory, skills, heartbeat, cron              |
|Hosting                   |Mac Mini, Pi 5, or DigitalOcean             |Dedicated hardware, isolated from personal data      |

-----

## Core Concept: Why This Works

The fundamental insight is that **OpenClaw agents only need a clear messaging channel**. The Even G1 glasses connect to the app on the Samsung Galaxy S24, which serves as that channel by:

1. **Voice Input → Agent Messages:** The glasses capture your voice via BLE and send it to the app on the Galaxy S24. The app transcribes it using Android’s speech recognition, and sends it to OpenClaw as a message in the Even G1 channel
1. **Agent Responses → Glasses Display:** OpenClaw agents respond with text, which the channel plugin formats for the G1’s display constraints and sends back to the phone app, which pushes it to the glasses via BLE
1. **Proactive Notifications:** Agents can push messages to the phone app, which then displays them on the glasses even when you’re not actively querying (heartbeat updates, task completions, alerts)
1. **Central Configuration:** The Lovable web dashboard lets you configure both the glasses behavior and agent behavior in one place, accessible from any device

**The Connection Chain:**

```
Even G1 Glasses ←(BLE)→ Galaxy S24 App ←(WebSocket/Tailscale)→ OpenClaw Gateway ←→ AI Agents
```

This architecture turns your glasses into a **wearable AI agent interface** rather than just a smart display, while keeping the complexity manageable by leveraging existing open-source components. The Galaxy S24 acts as the intelligent bridge between the glasses hardware and the agent runtime, with the option to add on-device AI capabilities as an optimization in later phases.