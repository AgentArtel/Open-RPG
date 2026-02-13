# Multi-Provider LLM Gateway

## The Idea in One Sentence

A provider-agnostic LLM gateway that routes NPC thinking to the cheapest adequate model — unlimited idle behavior via GitHub Copilot CLI ($10/mo flat), smarter conversation via Kimi K2.5, and complex reasoning via whatever's best — all behind a single `ILLMClient` interface.

---

## The Problem This Solves

Right now we're locked to one LLM provider (Moonshot Kimi). This creates three problems:

**Cost scales linearly with NPC count.** Every idle tick, every "wander around" decision costs real money. With 20 NPCs ticking every 15 seconds, that's 80 LLM calls per minute just for idle behavior. Even at K2's cheap rate ($0.60/MTok input), this adds up fast — and it's 95% waste since most idle responses are simple ("keep walking", "wait", "look around").

**Single point of failure.** If Moonshot goes down, rate-limits us, or deprecates a model, every NPC in the game freezes. No fallback, no graceful degradation.

**Model lock-in prevents optimization.** Some tasks (idle wandering) need a fast, cheap model. Some (player conversation) need a capable one. Some (reflection, planning) might need the best available. Our current two-tier system (K2 idle / K2.5 conversation) is a start, but the architecture doesn't support easily adding providers or tiers.

---

## The Inspiration

A Facebook post by Arsenie Ye (OpenClaw maintainer) demonstrated that GitHub Copilot CLI tools ($10/mo subscription) expose an OpenAI-compatible chat completions endpoint. OpenClaw already has a local API proxy that routes through Copilot's CLI tools, creating a standard `http://localhost:PORT/v1/chat/completions` endpoint.

Key insight: **the `openai` npm SDK we already use doesn't care where the API lives.** Switching providers is literally just changing `baseURL` and `apiKey`. Our architecture already supports this — we just need to formalize the provider abstraction.

---

## The Core Architecture

### Provider Registry

Instead of one hardcoded LLM client, we have a registry of providers:

```
┌──────────────────────────────────────────────┐
│              LLMGateway                      │
│  (implements ILLMClient)                     │
│                                              │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Moonshot │  │ Copilot  │  │  Future    │  │
│  │  Kimi    │  │  CLI     │  │ (Claude,   │  │
│  │ K2/K2.5  │  │  Proxy   │  │  GPT, etc) │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │         │
│       └──────┬───────┘──────────────┘         │
│              ▼                                │
│      Route by tier + config                   │
└──────────────────────────────────────────────┘
```

### Multi-Tier Model Selection

Expand beyond idle/conversation to support more decision tiers:

| Tier | Purpose | Default Provider | Fallback |
|------|---------|-----------------|----------|
| `idle` | Wandering, waiting, ambient behavior | Copilot CLI (free*) | Kimi K2 |
| `conversation` | Player dialogue, NPC-to-NPC chat | Kimi K2.5 | Copilot CLI |
| `reasoning` | Complex decisions, quest logic | Kimi K2.5 | Kimi K2 |
| `reflection` | Memory consolidation, self-evaluation | Copilot CLI (free*) | Kimi K2 |
| `importance` | Scoring memory importance (1-10) | Copilot CLI (free*) | Kimi K2 |

\* "Free" = covered by $10/mo Copilot subscription, no per-token cost.

### Config-Driven Routing

Each NPC's `AgentConfig` specifies which model to use per tier, with global defaults:

```yaml
# Global defaults (src/config/llm-providers.yaml)
providers:
  moonshot:
    baseURL: https://api.moonshot.ai/v1
    apiKeyEnv: MOONSHOT_API_KEY
  copilot:
    baseURL: http://localhost:11435/v1
    apiKeyEnv: COPILOT_API_KEY

routing:
  idle: copilot/gpt-5-mini
  conversation: moonshot/kimi-k2.5
  reasoning: moonshot/kimi-k2.5
  reflection: copilot/gpt-5-mini
  importance: copilot/gpt-5-mini

# Per-NPC override (src/config/agents/elder-theron.yaml)
model:
  idle: copilot/gpt-5-mini
  conversation: moonshot/kimi-k2.5
  # reasoning, reflection, importance inherit from global
```

---

## Why This Makes Sense for Us

1. **Zero architecture change required for the core interface.** `ILLMClient.complete()` already takes a model string. The gateway just adds provider routing on top.

2. **We already use the `openai` SDK.** Every provider that exposes an OpenAI-compatible endpoint (Moonshot, Copilot CLI proxy, OpenRouter, Together AI, local Ollama) works with the same SDK. No new dependencies.

3. **Backwards compatible.** The current `LLMClient` (TASK-008) becomes the "Moonshot provider." Everything else is additive.

4. **Cost optimization is immediate.** Moving idle ticks to Copilot CLI eliminates the largest volume of LLM calls from our bill. With 20 NPCs at 15-second intervals, that's ~115,000 calls/day shifted from pay-per-token to flat-rate.

5. **Resilience is built in.** If Copilot CLI is down, fall back to Kimi. If Kimi is down, fall back to Copilot CLI. NPCs never freeze.

---

## Concerns and Mitigations

**Copilot TOS for production use.** GitHub Copilot CLI is designed for developer tooling, not production game servers. Mitigation: Use it for development and testing initially (where it eliminates dev costs entirely). For production, evaluate whether the usage pattern falls within TOS, or use it as a development-only provider with Kimi as the production default.

**Copilot CLI requires local process.** The proxy runs as a local process, which adds a dependency to the server environment. Mitigation: The provider registry makes it optional — if the proxy isn't running, those tiers fall back to the next available provider.

**Latency variance across providers.** Different providers have different latency profiles. Mitigation: The tier system naturally handles this — idle behavior is latency-tolerant, conversation needs to be fast. Route accordingly.

**Rate limits on Copilot.** Unknown rate limits on the Copilot CLI endpoint. Mitigation: Monitor in development, add circuit-breaker pattern if needed.

---

## What Success Looks Like

### MVP (Phase 3.5)
- `LLMGateway` wraps one or more provider clients behind `ILLMClient`
- Provider routing based on tier from `AgentEvent.type`
- Copilot CLI provider works locally for development
- Fallback chain: if primary provider fails, try next in list
- Moonshot remains the only production provider initially

### Full Vision
- NPCs use 3+ tiers of model selection, automatically optimized per task
- Dev environment runs entirely on Copilot CLI ($0 marginal cost)
- Production uses Kimi for conversation quality, cheap models for everything else
- New providers added by implementing a ~30-line adapter class
- Cost dashboard shows per-NPC, per-tier token usage and cost

---

## Open Questions

1. **Should provider config live in YAML or environment variables?** YAML is more expressive (per-NPC overrides), env vars are simpler and more deployment-friendly.
2. **How do we handle provider-specific features?** Some providers support function calling, some don't. Some support system prompts differently. The gateway needs to normalize this.
3. **Should we build the Copilot CLI proxy ourselves or use OpenClaw's?** OpenClaw's proxy exists and works. We could vendor it or build a minimal version.
4. **What's the right granularity for tiers?** Two (idle/conversation) might be enough for MVP. Five might be over-engineering. Three (idle/conversation/reasoning) is probably the sweet spot.
