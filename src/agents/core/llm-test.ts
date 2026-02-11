/**
 * LLM Integration Feasibility Test (TASK-005)
 *
 * Validates that the Moonshot AI (Kimi) API can be called from within the
 * RPGJS server process. Moonshot exposes an OpenAI-compatible REST API at
 * https://api.moonshot.ai/v1, so we use the `openai` npm package with a
 * custom baseURL.
 *
 * This is a one-off validation — it will be replaced by the full LLMClient
 * implementation in TASK-008.
 *
 * Environment variable: MOONSHOT_API_KEY (or KIMI_API_KEY as fallback)
 *
 * @see docs/moonshot-api-integration.md
 * @see docs/openclaw-reference/docs/providers/moonshot.md
 */

// Load .env file for server-side environment variables
// Vite doesn't automatically load .env for server code, so we do it explicitly
import 'dotenv/config';

import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Moonshot API base URL (OpenAI-compatible endpoint). */
const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1';

/**
 * Fast, cost-effective model for testing.
 * The task brief specifies kimi-k2-0711-preview, but the current model list
 * shows kimi-k2-0905-preview as the latest preview. We'll try the one from
 * the task brief first, falling back to a known-good model.
 */
const TEST_MODEL = 'kimi-k2-0711-preview';

// ---------------------------------------------------------------------------
// API Key Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the Moonshot API key from environment variables.
 *
 * Note: Moonshot AI provides the Kimi API, so MOONSHOT_API_KEY and KIMI_API_KEY
 * are the same key. We check both for compatibility with different naming conventions.
 *
 * Priority:
 *   1. MOONSHOT_API_KEY (preferred name)
 *   2. KIMI_API_KEY (alternative name — same key, used by some project scripts)
 *
 * @returns The API key string, or null if not found.
 */
function resolveApiKey(): string | null {
    // Priority 1: MOONSHOT_API_KEY (preferred name)
    const moonshotKey = process.env.MOONSHOT_API_KEY;
    if (moonshotKey) {
        return moonshotKey;
    }

    // Priority 2: KIMI_API_KEY (alternative name — same key, different variable name)
    const kimiKey = process.env.KIMI_API_KEY;
    if (kimiKey) {
        return kimiKey;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Test Function
// ---------------------------------------------------------------------------

/**
 * Makes a simple chat completion call to the Moonshot AI API.
 *
 * This function:
 *   1. Resolves the API key from environment variables
 *   2. Creates an OpenAI client pointed at Moonshot's endpoint
 *   3. Sends a simple prompt ("Say hello in one word")
 *   4. Measures the round-trip latency
 *   5. Returns the response text and timing info
 *
 * @returns An object with the response text, model used, and latency in ms.
 * @throws If the API key is missing or the API call fails.
 */
export async function testLLMCall(): Promise<{
    response: string;
    model: string;
    latencyMs: number;
}> {
    // Step 1: Resolve API key
    const apiKey = resolveApiKey();
    if (!apiKey) {
        throw new Error(
            '[LLM-Test] No API key found. Set MOONSHOT_API_KEY or KIMI_API_KEY ' +
            'environment variable. See docs/moonshot-api-integration.md for setup.'
        );
    }

    // Step 2: Create OpenAI client with Moonshot's base URL
    const client = new OpenAI({
        apiKey,
        baseURL: MOONSHOT_BASE_URL,
    });

    // Step 3: Make the API call with timing
    const startTime = Date.now();

    const completion = await client.chat.completions.create({
        model: TEST_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant. Respond concisely.',
            },
            {
                role: 'user',
                content: 'Say hello in one word.',
            },
        ],
        max_tokens: 10, // Keep response tiny for testing
        temperature: 0,  // Deterministic for reproducibility
    });

    const latencyMs = Date.now() - startTime;

    // Step 4: Extract the response text
    const responseText = completion.choices?.[0]?.message?.content ?? '(no response)';
    const modelUsed = completion.model ?? TEST_MODEL;

    return {
        response: responseText.trim(),
        model: modelUsed,
        latencyMs,
    };
}

