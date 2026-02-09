# Multi-provider AI integration for TypeScript game NPC agents

**The Vercel AI SDK (v6) eliminates the need to hand-normalize tool definitions across Anthropic, Google Gemini, and Moonshot/OpenAI-compatible APIs.** Define your NPC actions once using Zod schemas and `tool()`, then swap providers with a single line change. Google Gemini offers the broadest free tier and a 1M-token context window across its lineup. Moonshot's KIMI K2.5 delivers frontier-level agentic performance at roughly **5–10× lower cost** than Claude, with full OpenAI-compatible tool calling. Below is a practical integration guide covering API formats, SDK choices, pricing, and the architecture needed to run model-agnostic NPC agents on a Node.js game server.

---

## Google Gemini: models, pricing, and the `@google/genai` SDK

### Current model lineup (February 2026)

Google's active Gemini models all share a **1,048,576-token (1M) input context window**. The 2.5+ generation outputs up to **65,536 tokens**, a significant jump from the 8K ceiling of 2.0 models. Gemini 2.0 Flash and Flash-Lite are **deprecated and shut down March 31, 2026**.

| Model | Code | Input/M | Output/M | Max output | Free tier |
|---|---|---|---|---|---|
| Gemini 3 Pro Preview | `gemini-3-pro-preview` | $2.00 | $12.00 | 65,536 | ❌ |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | $0.50 | $3.00 | 65,536 | ✅ |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | $1.25 | $10.00 | 65,536 | ✅ |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | $0.30 | $2.50 | 65,536 | ✅ |
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | $0.10 | $0.40 | 65,536 | ✅ |

Prompts exceeding 200K tokens incur 2× pricing on Pro models. A Batch API provides a 50% discount. For a game NPC system where individual calls are short, **Gemini 2.5 Flash** at $0.30/$2.50 per million tokens is the sweet spot — fast, cheap, and strong at function calling.

### SDK: use `@google/genai`, not `@google/generative-ai`

The legacy `@google/generative-ai` package is deprecated. The current unified SDK is **`@google/genai`** (v1.40.0+), which supports both the Gemini Developer API and Vertex AI from a single import. It requires Node.js 18+.

```bash
npm install @google/genai
```

```typescript
import { GoogleGenAI, Type, FunctionCallingConfigMode } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// For Vertex AI: new GoogleGenAI({ vertexai: true, project: 'my-project', location: 'us-central1' })
```

### Function calling format and execution loop

Gemini defines tools inside a `functionDeclarations` array using an **OpenAPI schema subset** — not standard JSON Schema. Type names use SDK enums (`Type.STRING`, `Type.OBJECT`) rather than plain strings.

```typescript
const npcTools = [{
  functionDeclarations: [{
    name: 'move_to',
    description: 'Move the NPC to coordinates',
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: 'X coordinate' },
        y: { type: Type.NUMBER, description: 'Y coordinate' },
        speed: { type: Type.STRING, enum: ['walk', 'run', 'sneak'] }
      },
      required: ['x', 'y']
    }
  }]
}];
```

When the model invokes a tool, the response contains `functionCall` parts. You execute the function, then return a `functionResponse` part on the user turn:

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: conversationHistory,
  config: {
    systemInstruction: 'You are a guard NPC. Use tools to patrol and respond to threats.',
    tools: npcTools,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } }
  }
});

if (response.functionCalls) {
  for (const fc of response.functionCalls) {
    const result = executeGameAction(fc.name, fc.args);
    // Append model turn and function response, then call again
    conversationHistory.push(response.candidates[0].content);
    conversationHistory.push({
      role: 'user',
      parts: [{ functionResponse: { name: fc.name, response: { result } } }]
    });
  }
}
```

Gemini natively supports **parallel function calling** — multiple `functionCall` parts in a single response — and **compositional (sequential) calling** across turns. Four tool-config modes control behavior: `AUTO` (model decides), `ANY` (forced tool call, optionally restricted to specific function names), `NONE` (text only), and `VALIDATED` (schema-strict when calling). System instructions use a dedicated `systemInstruction` field in the config, separate from the conversation `contents`.

### Free tier and rate limits

Google reduced free-tier quotas by 50–80% in December 2025. Current free limits are roughly **5–15 RPM**, **250K TPM**, and **100–1,000 RPD** depending on model. Paid Tier 1 (billing enabled) jumps to 150–300 RPM and 1M TPM. Rate limits are per-project across four dimensions — exceeding any triggers a 429 error with recommended exponential backoff.

---

## Moonshot KIMI K2 and K2.5: open-source power at a fraction of the cost

### What these models are

Moonshot AI (Beijing, backed by Alibaba/Tencent, valued ~$3.3B) builds the KIMI model family. Both K2 and K2.5 use a **Mixture-of-Experts architecture with 1 trillion total parameters and 32 billion activated** per forward pass, trained on 15+ trillion tokens.

**KIMI K2** launched in July 2025 with 128K context, later extended to **256K tokens** in the September 2025 update (`kimi-k2-0905`). A *K2-Thinking* variant (November 2025) adds explicit reasoning traces and can sustain **200–300 sequential tool calls** without drift — directly relevant to game NPC loops.

**KIMI K2.5** launched January 27, 2026. It adds **native multimodality** (vision + language trained jointly), a **256K context window**, and an "Agent Swarm" capability — up to **100 parallel sub-agents across 1,500 tool calls**. On benchmarks, K2.5 scores **76.8% on SWE-bench Verified** and **50.2% on Humanity's Last Exam** (with tools), the latter at 76% lower cost than Claude Opus 4.5.

### Pricing: dramatically cheaper than Claude

| Model | Input/M tokens | Cached input/M | Output/M tokens |
|---|---|---|---|
| K2 (`kimi-k2-0905`) | **$0.60** | $0.15 | **$2.50** |
| K2.5 | **$0.60** | $0.15 | **$2.50–$3.00** |
| *Claude Sonnet for reference* | *$3.00* | — | *$15.00* |

Context caching is **automatic** — no configuration needed — delivering 75% savings on repeated context. For a game server re-sending world state every turn, this matters significantly.

### API: fully OpenAI-compatible — use the OpenAI SDK directly

The Moonshot API at `https://api.moonshot.ai/v1` (global) speaks the **exact OpenAI chat completions protocol**, including the `tools` parameter format. This means your existing OpenAI-format tool definitions work without modification:

```typescript
import OpenAI from 'openai';

const moonshot = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: 'https://api.moonshot.ai/v1'
});

const response = await moonshot.chat.completions.create({
  model: 'kimi-k2-0905-chat',
  messages: [{ role: 'user', content: 'An enemy approaches from the north.' }],
  tools: [{
    type: 'function',
    function: {
      name: 'attack_target',
      description: 'Attack a specified target',
      parameters: {
        type: 'object',
        properties: {
          target_id: { type: 'string' },
          weapon: { type: 'string', enum: ['sword', 'bow', 'staff'] }
        },
        required: ['target_id', 'weapon']
      }
    }
  }],
  temperature: 0.6
});
```

Responses use standard `tool_calls` arrays; tool results go back as `role: "tool"` messages — identical to OpenAI. K2.5 is also available on **OpenRouter** (`moonshotai/kimi-k2.5`), **Together AI**, **Fireworks**, and **NVIDIA NIM**, all using the same OpenAI-compatible format. Model weights are open-source under a Modified MIT License on Hugging Face for self-hosting.

Rate limits start restrictive at Tier 0 (3 RPM, 1 concurrent request, 1.5M tokens/day) but scale to 10,000 RPM at Tier 5 ($3,000 cumulative recharge). A minimum $1 recharge is required to activate the API.

---

## How tool-calling formats differ across the three providers

Understanding the structural differences is essential for building (or choosing) an abstraction layer. The schema content is similar across providers — all use JSON Schema–like property definitions — but the **wrapping structures, response shapes, and result return formats** diverge:

| Aspect | Anthropic Claude | OpenAI / Moonshot | Google Gemini |
|---|---|---|---|
| Tool definition wrapper | `tools[].input_schema` | `tools[].function.parameters` | `tools[].functionDeclarations[].parameters` |
| Schema dialect | JSON Schema | JSON Schema | OpenAPI subset (UPPERCASE types) |
| Tool call in response | `tool_use` content block | `tool_calls[]` on message | `functionCall` in parts |
| Arguments format | Parsed object (`input`) | JSON string (`arguments`) | Parsed object (`args`) |
| Tool result return | `tool_result` content block | `role: "tool"` message | `functionResponse` part |
| Force tool call | `tool_choice: { type: 'any' }` | `tool_choice: 'required'` | `toolConfig.mode: 'ANY'` |
| System prompt | `system` parameter | `role: "system"` message | `systemInstruction` field |

Gemini additionally **silently ignores** some JSON Schema constraints (like `minLength`, `minItems`, string `format`), while OpenAI throws explicit errors for unsupported properties. Anthropic supports standard JSON Schema 2020-12 most robustly.

---

## The Vercel AI SDK v6 unifies everything

The **Vercel AI SDK** (`npm: ai`, v6, 20M+ monthly downloads) is the recommended integration layer. It provides a single `tool()` function and `generateText()` API that **automatically converts** Zod schemas into each provider's native format, normalizes responses, and runs multi-step tool execution loops.

### Installation

```bash
npm install ai zod
npm install @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai-compatible
```

### Define tools once, use everywhere

```typescript
import { z } from 'zod';
import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Moonshot via OpenAI-compatible provider
const moonshot = createOpenAICompatible({
  baseURL: 'https://api.moonshot.ai/v1',
  name: 'moonshot',
  apiKey: process.env.MOONSHOT_API_KEY
});

// Define game tools ONCE — works across all providers
const gameTools = {
  move: tool({
    description: 'Move the NPC to a location',
    inputSchema: z.object({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
      speed: z.enum(['walk', 'run', 'sneak']).default('walk')
    }),
    execute: async ({ x, y, speed }) => {
      // Your game engine logic here
      return { success: true, position: { x, y }, speed };
    }
  }),
  say: tool({
    description: 'Say something to nearby players',
    inputSchema: z.object({
      message: z.string().describe('What to say'),
      emote: z.enum(['neutral', 'angry', 'happy', 'scared']).optional()
    }),
    execute: async ({ message, emote }) => {
      return { spoken: true, message, emote: emote ?? 'neutral' };
    }
  }),
  look: tool({
    description: 'Look around and observe the environment',
    inputSchema: z.object({
      direction: z.enum(['north', 'south', 'east', 'west', 'around']).default('around')
    }),
    execute: async ({ direction }) => {
      return { entities: ['player_01', 'wolf_03'], terrain: 'forest clearing' };
    }
  })
};

// Use with ANY provider — zero tool code changes
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),        // Anthropic
  // model: google('gemini-2.5-flash'),                // Google Gemini
  // model: moonshot.chatModel('kimi-k2-0905-chat'),   // Moonshot K2
  system: 'You are a forest ranger NPC. Patrol your area and interact with players.',
  tools: gameTools,
  stopWhen: stepCountIs(10),  // Multi-step: up to 10 tool-call rounds
  prompt: 'A suspicious stranger enters the clearing carrying a stolen artifact.'
});
```

The SDK's `stopWhen: stepCountIs(N)` enables **automatic multi-step agentic loops** — the model calls tools, the SDK executes them, feeds results back, and repeats until the model responds with text or the step limit is reached. This is exactly the loop pattern an NPC agent needs.

### Per-step model switching with `prepareStep`

For cost optimization, use a powerful model for the first reasoning step and a cheaper model for follow-up tool calls:

```typescript
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  tools: gameTools,
  stopWhen: stepCountIs(10),
  prepareStep: async ({ stepNumber }) => {
    if (stepNumber > 0) {
      return { model: google('gemini-2.5-flash-lite') }; // Cheap follow-ups
    }
  },
  prompt: 'React to the approaching dragon.'
});
```

---

## Building provider fallback and runtime model selection

The Vercel AI SDK does not include built-in cross-provider fallback, but the pattern is straightforward to implement. For a game server running many concurrent NPC agents, wrap `generateText` in a fallback chain with circuit breakers:

```typescript
const PROVIDER_CHAIN = [
  { model: anthropic('claude-sonnet-4-20250514'), name: 'Anthropic' },
  { model: google('gemini-2.5-flash'),            name: 'Gemini' },
  { model: moonshot.chatModel('kimi-k2-0905-chat'), name: 'Moonshot' },
];

async function npcGenerate(options: Omit<Parameters<typeof generateText>[0], 'model'>) {
  for (const provider of PROVIDER_CHAIN) {
    try {
      return await generateText({ ...options, model: provider.model, maxRetries: 2 });
    } catch (err) {
      console.warn(`${provider.name} failed, trying next...`);
    }
  }
  throw new Error('All providers exhausted');
}
```

Alternatively, **OpenRouter** (`https://openrouter.ai/api/v1`) provides infrastructure-level fallback across 300+ models with a single API key. It speaks OpenAI-compatible format and works with `@ai-sdk/openai-compatible`, handling routing, retries, and provider selection automatically for roughly a 5% platform fee.

For Python-centric teams, **LiteLLM** offers a proxy server that exposes an OpenAI-compatible endpoint to Node.js while managing 400+ model backends with built-in fallback logic — though it adds operational complexity as a separate service.

---

## Practical recommendations for the game server

**For primary development**, use the Vercel AI SDK with `@ai-sdk/anthropic` for Claude. Define all NPC tools with `tool()` + Zod schemas. The `generateText` multi-step loop with `stopWhen` handles the core agent cycle of observe → decide → act.

**For cost-sensitive NPC tiers**, route background NPCs to **Gemini 2.5 Flash-Lite** ($0.10/$0.40 per M tokens) or **KIMI K2** ($0.60/$2.50), and reserve Claude or Gemini 2.5 Pro for important story NPCs. The `prepareStep` callback makes this switchable per agent or even per turn.

**For resilience**, implement the fallback chain above or route through OpenRouter. The key architectural insight is that Moonshot's OpenAI compatibility means any provider supporting that format slots into the same abstraction with zero tool-definition changes.

**For context efficiency**, both Gemini and Moonshot offer automatic prompt caching (75% savings on Moonshot, ~90% discount on Gemini). Structure your NPC prompts with a stable world-state prefix followed by per-turn updates to maximize cache hits.

The Vercel AI SDK's abstraction is mature enough that the tool-format differences between providers — `input_schema` vs. `function.parameters` vs. `functionDeclarations` — become invisible to application code. The main remaining gotcha is **Gemini's OpenAPI schema subset**: it silently drops constraints like `minLength` or `format`, so keep tool parameter schemas simple with basic types and enums. Anthropic is the most permissive with schema features, and OpenAI/Moonshot fall in between.