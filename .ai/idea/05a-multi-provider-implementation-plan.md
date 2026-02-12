# Multi-Provider LLM Gateway — Implementation Plan

## Overview

This document provides the technical implementation plan for adding multi-provider
LLM support to the agent system. It builds on top of TASK-008's `LLMClient` and
requires no changes to the agent runner, perception engine, or skill system.

**Prerequisites:** TASK-008 (AgentRunner + LLMClient) must be complete first.

---

## Architecture Summary

```
AgentRunner.run(event)
     │
     ▼
ILLMClient.complete(messages, options)
     │
     ▼
┌─────────────────────────────────┐
│         LLMGateway              │
│  ┌──────────────────────────┐   │
│  │  resolveProvider(tier)   │──►│ Reads from ProviderConfig
│  └──────────┬───────────────┘   │
│             ▼                   │
│  ┌──────────────────────────┐   │
│  │  tryWithFallback(chain)  │   │ Primary → Fallback₁ → Fallback₂
│  └──────────┬───────────────┘   │
│             ▼                   │
│  ┌──────────────────────────┐   │
│  │  provider.complete()     │   │ OpenAI SDK with provider-specific baseURL
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Define Provider Types

**File:** `src/agents/core/types.ts` (extend existing)

Add these types alongside the existing `ILLMClient`:

```typescript
/**
 * Tier of LLM usage — determines which provider/model is selected.
 * Maps to AgentEvent.type in the routing logic.
 */
export type LLMTier = 'idle' | 'conversation' | 'reasoning' | 'reflection' | 'importance';

/**
 * Configuration for a single LLM provider.
 */
export interface LLMProviderConfig {
  /** Unique provider identifier (e.g., 'moonshot', 'copilot', 'openrouter'). */
  readonly id: string;
  /** OpenAI-compatible base URL. */
  readonly baseURL: string;
  /** Environment variable name for the API key. */
  readonly apiKeyEnv: string;
  /** Default model for this provider if not specified per-tier. */
  readonly defaultModel: string;
  /** Whether this provider is currently enabled. */
  readonly enabled: boolean;
}

/**
 * Routing rule: maps a tier to a provider + model, with fallback chain.
 */
export interface TierRoute {
  /** The tier this route applies to. */
  readonly tier: LLMTier;
  /** Primary provider ID. */
  readonly provider: string;
  /** Model to use with the primary provider. */
  readonly model: string;
  /** Fallback provider/model pairs, tried in order if primary fails. */
  readonly fallbacks?: ReadonlyArray<{ provider: string; model: string }>;
}

/**
 * Complete gateway configuration.
 */
export interface LLMGatewayConfig {
  /** Available providers. */
  readonly providers: ReadonlyArray<LLMProviderConfig>;
  /** Routing rules per tier. */
  readonly routing: ReadonlyArray<TierRoute>;
}
```

### Step 2: Expand AgentModelConfig

**File:** `src/agents/core/types.ts` (modify existing)

The current `AgentModelConfig` only has `idle` and `conversation`. Expand it
to support the full tier system while remaining backward-compatible:

```typescript
export interface AgentModelConfig {
  /** Model for idle-tick behavior (cheapest). */
  readonly idle: string;
  /** Model for player conversations (most capable). */
  readonly conversation: string;
  /** Model for complex reasoning (optional, defaults to conversation). */
  readonly reasoning?: string;
  /** Model for memory reflection (optional, defaults to idle). */
  readonly reflection?: string;
  /** Model for importance scoring (optional, defaults to idle). */
  readonly importance?: string;
}
```

**Model string format:** `provider/model` (e.g., `moonshot/kimi-k2.5`, `copilot/gpt-5-mini`).
If no `/` is present, use the default provider from gateway config.

### Step 3: Build the LLM Provider Adapter

**File:** `src/agents/core/LLMProvider.ts` (new)

Each provider is a thin wrapper around the `openai` SDK with a different `baseURL`:

```typescript
import OpenAI from 'openai';
import type { LLMProviderConfig, ILLMClient, LLMMessage, LLMCompletionOptions, LLMResponse } from './types';

export class LLMProvider implements ILLMClient {
  readonly id: string;
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    this.id = config.id;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key: set ${config.apiKeyEnv} environment variable`);
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: config.baseURL,
    });
  }

  async complete(messages: ReadonlyArray<LLMMessage>, options: LLMCompletionOptions): Promise<LLMResponse> {
    // Same implementation as current LLMClient (TASK-008)
    // Maps our types to OpenAI SDK types, calls chat.completions.create()
    // Maps response back to our LLMResponse type
    // Classifies errors (rate_limit, auth_error, timeout, context_overflow)
  }
}
```

**Key insight:** This is almost identical to the `LLMClient` from TASK-008. The
refactor simply parameterizes the `baseURL` and `apiKey` instead of hardcoding them.

### Step 4: Build the LLM Gateway

**File:** `src/agents/core/LLMGateway.ts` (new)

The gateway implements `ILLMClient` but routes calls through the provider registry:

```typescript
import type { ILLMClient, LLMMessage, LLMCompletionOptions, LLMResponse, LLMGatewayConfig, LLMTier } from './types';
import { LLMProvider } from './LLMProvider';

export class LLMGateway implements ILLMClient {
  private providers: Map<string, LLMProvider> = new Map();
  private config: LLMGatewayConfig;

  constructor(config: LLMGatewayConfig) {
    this.config = config;
    // Initialize only enabled providers
    for (const providerConfig of config.providers) {
      if (providerConfig.enabled) {
        try {
          this.providers.set(providerConfig.id, new LLMProvider(providerConfig));
        } catch (err) {
          console.warn(`[LLMGateway] Provider ${providerConfig.id} unavailable: ${err}`);
        }
      }
    }
  }

  /**
   * Route a completion call through the appropriate provider.
   * Parses the model string to determine provider, falls back on errors.
   */
  async complete(messages: ReadonlyArray<LLMMessage>, options: LLMCompletionOptions): Promise<LLMResponse> {
    const { provider: providerId, model } = this.parseModelString(options.model);
    const route = this.getRouteForModel(providerId, model);

    // Try primary, then fallbacks
    const chain = [route.primary, ...(route.fallbacks || [])];
    let lastError: Error | null = null;

    for (const target of chain) {
      const provider = this.providers.get(target.provider);
      if (!provider) continue;

      try {
        return await provider.complete(messages, { ...options, model: target.model });
      } catch (err) {
        lastError = err as Error;
        console.warn(`[LLMGateway] ${target.provider}/${target.model} failed, trying next...`);
      }
    }

    throw lastError || new Error('[LLMGateway] No available providers');
  }

  private parseModelString(model: string): { provider: string; model: string } {
    if (model.includes('/')) {
      const [provider, ...rest] = model.split('/');
      return { provider, model: rest.join('/') };
    }
    // No provider prefix — use first available provider
    return { provider: this.config.providers[0]?.id ?? 'moonshot', model };
  }
}
```

### Step 5: Gateway Configuration File

**File:** `src/config/llm-gateway.yaml` (new) or use environment variables

```yaml
# LLM Gateway Configuration
# Provider definitions and tier routing

providers:
  - id: moonshot
    baseURL: https://api.moonshot.ai/v1
    apiKeyEnv: MOONSHOT_API_KEY
    defaultModel: kimi-k2-0905-chat
    enabled: true

  - id: copilot
    baseURL: http://localhost:11435/v1
    apiKeyEnv: COPILOT_API_KEY
    defaultModel: gpt-5-mini
    enabled: false  # Enable when proxy is running

routing:
  - tier: idle
    provider: moonshot
    model: kimi-k2-0905-chat
    fallbacks: []

  - tier: conversation
    provider: moonshot
    model: kimi-k2.5
    fallbacks:
      - provider: moonshot
        model: kimi-k2-0905-chat

  - tier: reasoning
    provider: moonshot
    model: kimi-k2.5
    fallbacks: []

  - tier: reflection
    provider: moonshot
    model: kimi-k2-0905-chat
    fallbacks: []

  - tier: importance
    provider: moonshot
    model: kimi-k2-0905-chat
    fallbacks: []
```

### Step 6: Wire Into AgentRunner

**File:** `src/agents/core/AgentRunner.ts` (modify, minimal change)

The AgentRunner already selects a model based on event type. The only change is:

```typescript
// BEFORE (TASK-008):
private selectModel(event: AgentEvent): string {
  return event.type === 'idle_tick'
    ? this.config.model.idle
    : this.config.model.conversation;
}

// AFTER (multi-provider):
private selectModel(event: AgentEvent): string {
  const tierMap: Record<string, LLMTier> = {
    'idle_tick': 'idle',
    'player_action': 'conversation',
    'player_proximity': 'conversation',
    'system_event': 'reasoning',
  };
  const tier = tierMap[event.type] ?? 'idle';
  return this.config.model[tier] ?? this.config.model.idle;
}
```

**That's it.** The AgentRunner doesn't need to know about providers — it just
passes the model string to `ILLMClient.complete()`, and the gateway handles routing.

### Step 7: Copilot CLI Proxy Setup (Optional)

**File:** `scripts/start-copilot-proxy.sh` (new, for local development)

The OpenClaw proxy or a minimal version that:
1. Authenticates via GitHub Copilot CLI token
2. Exposes `http://localhost:11435/v1/chat/completions`
3. Forwards requests to Copilot's API
4. Returns OpenAI-compatible responses

This is a development convenience, not a production requirement.

---

## Implementation Order

```
TASK-010 (LLMGateway + Provider Types)
    │
    └─► Can be done immediately after TASK-008
        No changes to perception, skills, or runner logic
        LLMClient from TASK-008 becomes MoonshotProvider

TASK-011 (Copilot CLI Provider)
    │
    └─► Can be done in parallel or after TASK-010
        Only adds one new provider adapter
        Includes proxy startup script
```

---

## What Changes vs. What Doesn't

| Component | Changes? | Details |
|-----------|----------|---------|
| `ILLMClient` interface | NO | Gateway implements the same interface |
| `AgentRunner` | MINIMAL | Model selection function adds tier mapping |
| `AgentModelConfig` | YES | Add optional `reasoning`, `reflection`, `importance` fields |
| `LLMClient` (TASK-008) | REFACTORED | Becomes `LLMProvider` class, parameterized |
| `LLMGateway` | NEW | Provider registry + routing + fallback |
| `LLMProvider` | NEW | Parameterized version of LLMClient |
| Skills | NO | No changes |
| Perception | NO | No changes |
| Memory | NO | No changes |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Copilot TOS issue | Medium | Low | Use only for dev; production stays on Kimi |
| Provider config complexity | Low | Medium | Sane defaults; YAML optional, env vars work |
| Fallback chain adds latency | Low | Low | Timeouts per provider; fast fail |
| Feature creep | Medium | Medium | Strict MVP: 2 providers, simple routing |

---

## Testing Strategy

1. **Unit test LLMProvider** — Mock OpenAI SDK, verify request/response mapping
2. **Unit test LLMGateway** — Mock providers, verify routing and fallback logic
3. **Integration test** — Real calls to Moonshot API (existing test pattern from TASK-005)
4. **Manual test** — Start Copilot proxy, verify routing works end-to-end

---

## Estimated Scope

- **TASK-010:** ~200 lines of new code + ~50 lines of type additions + config file
- **TASK-011:** ~80 lines of provider adapter + proxy script
- **Total:** ~330 lines of code, no changes to existing working components
