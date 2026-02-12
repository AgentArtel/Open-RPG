## TASK-010: Multi-Provider LLM Gateway

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 3.5 (Post-Core Enhancement)
- **Type**: Create + Refactor
- **Depends on**: TASK-008 (LLMClient must exist first)
- **Blocks**: TASK-011 (Copilot CLI Provider)

### Context

The current `LLMClient` (TASK-008) is hardcoded to Moonshot's API endpoint.
This task refactors it into a provider-agnostic gateway that can route LLM calls
to different providers based on the task tier (idle, conversation, reasoning, etc.).

The key insight: since we use the `openai` npm SDK and every provider we care
about exposes an OpenAI-compatible endpoint, switching providers is just changing
`baseURL` and `apiKey`. The gateway formalizes this with a provider registry,
tier-based routing, and fallback chains.

This does NOT change the `ILLMClient` interface — the gateway implements it.
The AgentRunner doesn't need to know about providers. It passes a model string,
the gateway handles routing.

### Objective

A working `LLMGateway` that implements `ILLMClient`, routes calls through a
configurable provider registry, and supports fallback chains when a provider fails.

### Specifications

**Create files:**
- `src/agents/core/LLMProvider.ts` — single-provider client (parameterized LLMClient)
- `src/agents/core/LLMGateway.ts` — provider registry + routing + fallback
- `src/config/llm-gateway.yaml` — provider and routing configuration

**Modify files:**
- `src/agents/core/types.ts` — add `LLMTier`, `LLMProviderConfig`, `TierRoute`, `LLMGatewayConfig`
- `src/agents/core/types.ts` — expand `AgentModelConfig` with optional tiers
- `src/agents/core/AgentRunner.ts` — update `selectModel()` to map event types to tiers
- `src/agents/core/index.ts` — export new modules

**LLMProvider (~60 lines):**
- Parameterized version of the `LLMClient` from TASK-008
- Constructor takes `LLMProviderConfig` (id, baseURL, apiKeyEnv, defaultModel)
- Implements `ILLMClient.complete()` — same logic as LLMClient
- Reads API key from `process.env[config.apiKeyEnv]`
- Creates `openai` SDK client with `config.baseURL`

**LLMGateway (~120 lines):**
- Implements `ILLMClient`
- Constructor takes `LLMGatewayConfig` (providers list + routing rules)
- Initializes only enabled providers (skip unavailable ones gracefully)
- `complete()` method:
  1. Parse model string: `"provider/model"` → `{ provider, model }`
  2. If no provider prefix, use first available provider
  3. Try primary provider
  4. On failure, try fallbacks in order
  5. Log warnings for each failed attempt
  6. Throw only if all providers fail
- `getAvailableProviders()` — list initialized providers
- `isProviderAvailable(id)` — check if a specific provider is ready

**Type additions:**

```typescript
// Add to src/agents/core/types.ts

export type LLMTier = 'idle' | 'conversation' | 'reasoning' | 'reflection' | 'importance';

export interface LLMProviderConfig {
  readonly id: string;
  readonly baseURL: string;
  readonly apiKeyEnv: string;
  readonly defaultModel: string;
  readonly enabled: boolean;
}

export interface TierRoute {
  readonly tier: LLMTier;
  readonly provider: string;
  readonly model: string;
  readonly fallbacks?: ReadonlyArray<{ provider: string; model: string }>;
}

export interface LLMGatewayConfig {
  readonly providers: ReadonlyArray<LLMProviderConfig>;
  readonly routing: ReadonlyArray<TierRoute>;
}
```

**AgentModelConfig expansion:**

```typescript
// Modify existing AgentModelConfig
export interface AgentModelConfig {
  readonly idle: string;
  readonly conversation: string;
  readonly reasoning?: string;    // NEW — defaults to conversation
  readonly reflection?: string;   // NEW — defaults to idle
  readonly importance?: string;   // NEW — defaults to idle
}
```

**Model string format:** `"provider/model"` (e.g., `"moonshot/kimi-k2.5"`).
If no `/` separator, model is passed to the default provider.

**AgentRunner selectModel() update:**

```typescript
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

**Gateway config file (YAML):**

```yaml
providers:
  - id: moonshot
    baseURL: https://api.moonshot.ai/v1
    apiKeyEnv: MOONSHOT_API_KEY
    defaultModel: kimi-k2-0905-chat
    enabled: true

routing:
  - tier: idle
    provider: moonshot
    model: kimi-k2-0905-chat
  - tier: conversation
    provider: moonshot
    model: kimi-k2.5
  - tier: reasoning
    provider: moonshot
    model: kimi-k2.5
  - tier: reflection
    provider: moonshot
    model: kimi-k2-0905-chat
  - tier: importance
    provider: moonshot
    model: kimi-k2-0905-chat
```

**Error handling:**
- Provider initialization failures are warnings, not crashes (skip that provider)
- Missing API keys skip the provider (don't throw)
- Fallback chain exhaustion throws with combined error details
- Never crash the game server — return graceful error to AgentRunner

### Acceptance Criteria

- [ ] `LLMProvider` implements `ILLMClient` with parameterized baseURL/apiKey
- [ ] `LLMGateway` implements `ILLMClient` with provider registry
- [ ] Gateway routes `"provider/model"` strings to the correct provider
- [ ] Fallback chain works when primary provider fails
- [ ] `AgentModelConfig` expanded with optional tier fields
- [ ] `AgentRunner.selectModel()` maps event types to tiers
- [ ] Gateway config loads from YAML
- [ ] Unavailable providers are skipped gracefully (no crash)
- [ ] Existing Moonshot-only behavior is preserved as default
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Build the Copilot CLI proxy or provider (that's TASK-011)
- Change the `ILLMClient` interface (gateway wraps it, doesn't alter it)
- Delete the original `LLMClient` from TASK-008 (refactor it into `LLMProvider`)
- Add retry/backoff logic beyond simple fallback (keep it simple)
- Add streaming support (batch responses are fine for MVP)

### Reference

- Feature idea: `.ai/idea/05-multi-provider-llm-gateway.md`
- Implementation plan: `.ai/idea/05a-multi-provider-implementation-plan.md`
- Existing LLM types: `src/agents/core/types.ts` (ILLMClient, LLMCompletionOptions, LLMResponse)
- Existing LLM test: `src/agents/core/llm-test.ts` (shows openai SDK + Moonshot pattern)
- LLMClient (TASK-008 output): `src/agents/core/LLMClient.ts`
- AgentRunner (TASK-008 output): `src/agents/core/AgentRunner.ts`
- OpenClaw patterns: `docs/openclaw-patterns.md` — error handling, provider abstraction

### Handoff Notes

_(To be filled by implementer)_
