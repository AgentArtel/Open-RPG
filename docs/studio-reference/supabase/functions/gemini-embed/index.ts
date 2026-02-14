import { GoogleGenAI } from 'npm:@google/genai'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface EmbedRequest {
  text: string | string[]
  model?: string
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
    const body = (await req.json()) as EmbedRequest

    if (!body.text || (typeof body.text !== 'string' && !Array.isArray(body.text))) {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'text is required (string or string[])' }, 400)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[gemini-embed] GEMINI_API_KEY not set')
      return jsonResponse({ success: false, error: 'api_unavailable' }, 503)
    }

    const ai = new GoogleGenAI({ apiKey })
    const model = body.model || 'gemini-embedding-001'
    const texts = Array.isArray(body.text) ? body.text : [body.text]

    const embeddings: number[][] = []

    for (const t of texts) {
      const response = await ai.models.embedContent({
        model,
        contents: t,
      })
      if (response.embeddings && response.embeddings.length > 0) {
        embeddings.push(response.embeddings[0].values ?? [])
      }
    }

    return jsonResponse({ success: true, embeddings })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[gemini-embed] Error:', errorMessage)
    return jsonResponse({ success: false, error: 'api_error', message: 'Embedding generation failed' })
  }
})
