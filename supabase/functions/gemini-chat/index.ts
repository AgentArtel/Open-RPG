import { GoogleGenAI } from 'npm:@google/genai'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ChatMessage {
  role: string
  content: string
}

interface GeminiChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405)
  }

  try {
    const body = (await req.json()) as GeminiChatRequest

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'messages array is required' }, 400)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[gemini-chat] GEMINI_API_KEY not set')
      return jsonResponse({ success: false, error: 'api_unavailable' }, 503)
    }

    const ai = new GoogleGenAI({ apiKey })
    const model = body.model || 'gemini-2.5-flash'

    // Build contents array for Gemini
    const contents = body.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const config: Record<string, unknown> = {}
    if (body.temperature !== undefined) config.temperature = body.temperature
    if (body.maxTokens !== undefined) config.maxOutputTokens = body.maxTokens
    if (body.systemPrompt) config.systemInstruction = body.systemPrompt

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    })

    const text = response.text ?? ''
    const usage = {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    }

    return jsonResponse({ success: true, text, usage })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[gemini-chat] Error:', errorMessage)

    if (errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('SAFETY')) {
      return jsonResponse({ success: false, error: 'content_policy', message: 'Response blocked by safety policy' })
    }

    return jsonResponse({ success: false, error: 'api_error', message: 'Chat completion failed' })
  }
})
