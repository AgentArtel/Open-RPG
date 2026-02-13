## TASK-011: GitHub Copilot CLI Provider Adapter

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 3.5 (Post-Core Enhancement)
- **Type**: Create
- **Depends on**: TASK-010 (LLMGateway must exist first)
- **Blocks**: Nothing (optional enhancement)

### Context

GitHub Copilot CLI ($10/mo flat-rate subscription) exposes an OpenAI-compatible
chat completions endpoint through a local proxy. OpenClaw already has a working
proxy implementation that authenticates via Copilot CLI tools and serves requests
at `http://localhost:PORT/v1/chat/completions`.

This task adds a Copilot CLI provider to the LLMGateway (TASK-010) and includes
a proxy startup script for local development. This eliminates per-token costs
for development and testing — all LLM calls route through the flat-rate
Copilot subscription instead of Moonshot's pay-per-token API.

**Important:** This is a development/testing optimization. Production deployment
should default to Moonshot unless Copilot TOS is confirmed to allow this use case.

### Objective

A working Copilot CLI provider adapter that plugs into the LLMGateway, plus
a convenience script to start the local proxy.

### Specifications

**Create files:**
- `scripts/start-copilot-proxy.sh` — starts the OpenClaw-style Copilot proxy
- `src/config/llm-gateway.dev.yaml` — dev config with Copilot as default for idle

**Modify files:**
- `src/config/llm-gateway.yaml` — add Copilot provider entry (disabled by default)

**Copilot provider in gateway config:**

```yaml
# Add to src/config/llm-gateway.yaml
providers:
  # ... existing moonshot entry ...
  - id: copilot
    baseURL: http://localhost:11435/v1
    apiKeyEnv: COPILOT_API_KEY
    defaultModel: gpt-5-mini
    enabled: false  # Enable manually or use llm-gateway.dev.yaml
```

**Dev config with Copilot routing:**

```yaml
# src/config/llm-gateway.dev.yaml
# Development configuration — routes idle/reflection/importance through Copilot
# Requires: scripts/start-copilot-proxy.sh running locally

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
    enabled: true

routing:
  - tier: idle
    provider: copilot
    model: gpt-5-mini
    fallbacks:
      - provider: moonshot
        model: kimi-k2-0905-chat

  - tier: conversation
    provider: moonshot
    model: kimi-k2.5
    fallbacks:
      - provider: copilot
        model: gpt-5-mini

  - tier: reasoning
    provider: moonshot
    model: kimi-k2.5
    fallbacks:
      - provider: copilot
        model: gpt-5-mini

  - tier: reflection
    provider: copilot
    model: gpt-5-mini
    fallbacks:
      - provider: moonshot
        model: kimi-k2-0905-chat

  - tier: importance
    provider: copilot
    model: gpt-5-mini
    fallbacks:
      - provider: moonshot
        model: kimi-k2-0905-chat
```

**Proxy startup script:**

```bash
#!/bin/bash
# scripts/start-copilot-proxy.sh
#
# Starts a local OpenAI-compatible proxy that routes through GitHub Copilot CLI.
# Requires: GitHub Copilot CLI tools installed and authenticated.
#
# Usage:
#   ./scripts/start-copilot-proxy.sh
#   # Proxy runs at http://localhost:11435/v1/chat/completions
#
# Environment:
#   COPILOT_PROXY_PORT — Port to listen on (default: 11435)
```

The proxy implementation options:
1. **Vendor OpenClaw's proxy** — Copy their working implementation (~100 lines)
2. **Build minimal proxy** — Node.js Express server that forwards to Copilot CLI
3. **Use OpenClaw as dependency** — If they publish the proxy as a package

Recommendation: Build a minimal proxy (~80 lines) that:
- Reads Copilot CLI auth token from `~/.config/github-copilot/`
- Exposes `/v1/chat/completions` endpoint
- Forwards requests to Copilot's API endpoint
- Returns OpenAI-compatible responses
- Logs request/response for debugging

**Gateway config loading:**

The LLMGateway should support loading config from:
1. `LLM_GATEWAY_CONFIG` env var (path to YAML file)
2. `src/config/llm-gateway.yaml` (production default)

In development, set `LLM_GATEWAY_CONFIG=src/config/llm-gateway.dev.yaml`.

**Health check:**

Add a simple health check to the gateway that verifies provider connectivity:

```typescript
// Add to LLMGateway
async healthCheck(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const [id, provider] of this.providers) {
    try {
      // Send a minimal completion request
      await provider.complete(
        [{ role: 'user', content: 'hi' }],
        { model: provider.defaultModel, maxTokens: 1 }
      );
      results[id] = true;
    } catch {
      results[id] = false;
    }
  }
  return results;
}
```

### Acceptance Criteria

- [ ] Copilot provider entry added to gateway config (disabled by default)
- [ ] Dev config file routes idle/reflection/importance through Copilot
- [ ] Proxy startup script works on Linux/macOS
- [ ] Gateway loads dev config when `LLM_GATEWAY_CONFIG` env var is set
- [ ] Fallback from Copilot to Moonshot works when proxy is not running
- [ ] Health check reports provider status
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Enable Copilot provider by default in production config
- Make Copilot a required dependency (game must work without it)
- Implement complex retry/rate-limit handling for the proxy
- Modify the `ILLMClient` interface
- Add Copilot-specific logic to the AgentRunner (routing is the gateway's job)

### Reference

- Feature idea: `.ai/idea/05-multi-provider-llm-gateway.md`
- Implementation plan: `.ai/idea/05a-multi-provider-implementation-plan.md`
- LLMGateway: `src/agents/core/LLMGateway.ts` (TASK-010 output)
- LLMProvider: `src/agents/core/LLMProvider.ts` (TASK-010 output)
- OpenClaw Copilot proxy: Referenced in Arsenie Ye's post (OpenClaw source)
- Gateway types: `src/agents/core/types.ts` (LLMProviderConfig, TierRoute, etc.)

### Handoff Notes

_(To be filled by implementer)_
