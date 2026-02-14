import { GoogleGenAI } from 'npm:@google/genai'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface VisionRequest {
  prompt: string
  imageUrl: string
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
    const body = (await req.json()) as VisionRequest

    if (!body.prompt || typeof body.prompt !== 'string') {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'prompt is required' }, 400)
    }
    if (!body.imageUrl || typeof body.imageUrl !== 'string') {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'imageUrl is required' }, 400)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[gemini-vision] GEMINI_API_KEY not set')
      return jsonResponse({ success: false, error: 'api_unavailable' }, 503)
    }

    const ai = new GoogleGenAI({ apiKey })
    const model = body.model || 'gemini-2.5-flash'

    // Fetch the image and convert to base64
    const imageResponse = await fetch(body.imageUrl)
    if (!imageResponse.ok) {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'Failed to fetch image from URL' }, 400)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const contentType = imageResponse.headers.get('content-type') || 'image/png'

    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: contentType, data: base64Image } },
          { text: body.prompt },
        ],
      }],
    })

    const text = response.text ?? ''
    return jsonResponse({ success: true, text })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[gemini-vision] Error:', errorMessage)

    if (errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('SAFETY')) {
      return jsonResponse({ success: false, error: 'content_policy', message: 'Response blocked by safety policy' })
    }

    return jsonResponse({ success: false, error: 'api_error', message: 'Vision analysis failed' })
  }
})
