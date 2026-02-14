# Agent Artel — Project Description

-----

## The Short Version

Agent Artel is a visual builder for designing, configuring, and deploying OpenClaw AI agents. Think of it as what n8n is for workflow automation, but purpose-built for the OpenClaw agent ecosystem — a drag-and-drop canvas where you wire together triggers, models, memory, tools, and skills into agent workflows you can test, monitor, and run from one place.

-----

## The Full Picture

### What problem are we solving?

OpenClaw is one of the most exciting open-source projects in AI right now. It's a personal AI agent that runs on your own hardware, talks to you through the messaging apps you already use, and can actually *do things* — run shell commands, control your browser, manage your calendar, send emails, negotiate with your insurance company while you sleep. It went from zero to 100k+ GitHub stars in under a week because people immediately understood the value: a real AI assistant, not a chatbot.

But here's the gap: configuring OpenClaw is a developer-first experience. You're editing JSON and YAML files, writing skills in Markdown, configuring providers in `openclaw.json`, and debugging through chat logs. The agent loop itself — input, context, model, tools, repeat, reply — is powerful, but it's invisible. You can't *see* it. You can't drag a model into a workflow, wire it to a memory system, attach tools, set a trigger, and watch data flow through the pipeline. You have to imagine all of that while staring at config files.

n8n solved this exact problem for workflow automation. They took the concept of connecting services and processing data — something developers had been doing in code forever — and made it visual. A canvas where you drag nodes, draw connections, configure parameters, and watch executions happen in real time. It didn't replace code — it made the architecture *visible* and *manipulable* by humans who think spatially.

Agent Artel does the same thing for AI agent building, specifically for the OpenClaw ecosystem.

-----

### What are we building?

A web-based visual agent builder with these core surfaces:

**The Canvas** — an infinite, pannable, zoomable workspace (like n8n's editor) where you construct agent workflows by placing and connecting nodes. You drag a Chat Trigger node onto the canvas, connect it to an AI Agent node, wire that agent to an OpenAI or Anthropic model, attach a Postgres memory module, add tool nodes for HTTP requests or code execution — and you can *see* the entire architecture of your agent laid out in front of you. Green glowing connection lines show the data flow. You click a node to configure it. You hit Run and watch execution status ripple through the graph in real time.

**Node Configuration** — when you click any node on the canvas, a detail panel opens with the specific settings for that node type. An OpenAI model node shows credential selection, model picker, and temperature controls on a distinctive green gradient card. An AI Agent node shows its prompt configuration as editable JSON, its tool connections, and iteration limits. A trigger node shows its webhook URL or chat source. Every node type has a tailored configuration form.

**Execution Monitoring** — when a workflow runs, you see it happen. Each node shows its status: waiting, running, success, or error. A real-time log viewer streams the actual output — downloading caches, cloning repositories, installing dependencies, generating content. You can click any connection line to see the data that flowed through it. After execution, you get a full history with per-node breakdowns.

**Chat Testing** — since many OpenClaw agents are conversational, the builder includes an embedded chat interface. You wire up a chat trigger, configure your agent, and test it right there in the editor. Send a message, watch it flow through the nodes, see the response come back. No switching between apps.

**Agent Library** — browse and import pre-built agent templates. Marketing content generators, customer support agents, data processing pipelines, DevOps automation — starting points you can customize on the canvas rather than building from scratch.

-----

### Why build this instead of just using n8n?

n8n is excellent and we're drawing heavy inspiration from it — their open-source codebase (Vue 3, Vue Flow for the canvas, Pinia for state management) is a reference architecture we're studying closely. But n8n is a general-purpose workflow automation platform. It does everything from sending Slack messages to processing spreadsheets to managing CRM data, with 400+ integrations.

Agent Artel is specifically for AI agent building. That means:

**Agent-native primitives.** Our node types are models, memory systems, tools, skills, and agent routers — not generic HTTP endpoints and data transformers. The node configuration UI understands what a creativity ratio slider means, what a prompt template with JSON schema looks like, how a multi-agent routing decision works. n8n's AI nodes exist but they're one category among hundreds.

**OpenClaw integration.** We're building toward direct deployment of configured agents to OpenClaw gateways. You design an agent on the canvas, test it in the chat interface, and push it to your running OpenClaw instance. The skills, channel routing, heartbeat configuration, and memory setup translate from the visual representation to OpenClaw's workspace structure. This isn't a generic automation platform that happens to support AI — it's a builder that speaks OpenClaw natively.

**Tailored UX for agent workflows.** AI agent building has specific patterns that benefit from specialized visualization. Multi-agent routing (different agents handling different channels or conversation types), memory persistence across sessions, tool selection and fallback chains, prompt engineering with structured output schemas — these deserve first-class visual representations, not workarounds inside a general-purpose system.

**Our own needs at Artelio.** As an AI ethics consulting company, we're building agent systems for real work — content generation, research automation, client communication workflows. We need a builder that reflects how we think about agent architecture, not a generic tool we contort to fit.

-----

### What's our relationship to n8n's open source work?

We respect it enormously and we're learning from it. n8n's codebase — particularly their canvas implementation, node system architecture, and execution engine design — represents years of iteration on the visual workflow builder problem. Their decisions about state management, undo/redo, node configuration panel behavior, connection validation, and canvas performance are battle-tested with a massive user base.

We're not forking n8n. We're building our own platform in React (not Vue), with our own design system, our own node types, and our own backend architecture. But we're studying their approaches to understand what worked and what didn't:

How they handle canvas performance with 50+ nodes. How their Node Detail View (NDV) manages complex configuration forms. How their execution engine reports per-node status back to the frontend. How they structure node type definitions with input/output specifications. How they manage credential storage and reference across nodes. How their undo/redo system tracks graph mutations.

These are hard problems they've already solved. We'd be foolish not to study their solutions before building ours.

-----

### Where are we today?

We have the surrounding application built — dashboard, workflow list, execution history, credentials manager, settings, agent template library. Fifty-plus UI components following our design system: a dark theme with green accents (#79F181 on #0A0A0A), Urbanist typography, glassmorphic green gradient cards, and a signature neon green glow effect on active elements.

What we're building now is the core: the visual canvas, the node system, the connection wiring, the configuration panels, the execution visualization, and the chat testing interface. This is the product itself — everything built so far is the frame around it.

-----

### Where are we going?

This is iterative. We're not trying to build n8n overnight. The roadmap looks roughly like this:

**Phase 1 (Now):** Visual canvas with drag-and-drop nodes, connection wiring, node configuration panels, and basic execution visualization. A working workflow editor where you can construct and configure an AI agent pipeline visually.

**Phase 2:** Live execution monitoring with real-time logs, embedded chat testing, and the creativity/parameter tuning visualizations. Making the builder not just a design tool but a testing environment.

**Phase 3:** OpenClaw deployment integration. Export workflows as OpenClaw skill configurations. Push agent configs to a running gateway. Monitor deployed agents from the same interface where you designed them.

**Phase 4:** Multi-agent orchestration. Visual routing between agents based on channel, conversation context, or task type. Agent-to-agent delegation visible on the canvas. Workspace management for teams of agents.

**Phase 5:** Community and marketplace. Share agent templates. Import skills from ClawHub directly into the visual builder. Collaborative editing for teams.

Each phase builds on the last. The canvas is the foundation everything else stands on, which is why it's the current priority.

-----

### Who is this for?

Primarily for people who are building with OpenClaw and want a visual way to design, test, and manage their agents. That includes developers who prefer spatial thinking over config-file editing, teams who need to collaborate on agent architecture, and power users who want to experiment with different model/memory/tool combinations without rewriting YAML.

Secondarily, for anyone building AI agent systems who wants a visual builder with agent-native primitives rather than a general-purpose automation tool with AI bolted on.

And for us at Artelio — this is the platform we use to build and manage our own AI agent deployments for client work.

-----

## Technical Orientation

**Frontend:** React (Next.js), TypeScript, Tailwind CSS
**Canvas Engine:** Custom implementation or React Flow (xyflow) — studying n8n's use of Vue Flow
**Design System:** Dark theme, Urbanist font, green accent palette, documented in our component library
**State Management:** React context + hooks (evaluating Zustand for workflow graph state)
**Reference Architecture:** n8n open source (Vue 3, Vue Flow, Pinia) — learning from, not forking
**Target Integration:** OpenClaw gateway API, OpenClaw skill format, OpenClaw workspace structure
**Current Status:** Application shell complete (6 pages, 50+ components). Core canvas and builder in active development.

-----

*Agent Artel is a project of Artelio, an AI ethics consulting company. Built by Artel, Creative Director and founder.*
