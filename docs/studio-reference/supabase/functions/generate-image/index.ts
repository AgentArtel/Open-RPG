import { GoogleGenAI } from 'npm:@google/genai'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface GenerateImageRequest {
  prompt: string
  style?: string
  agentId?: string
}

interface GenerateImageResponse {
  success: boolean
  imageDataUrl?: string
  imageUrl?: string
  error?: string
  message?: string
}

function jsonResponse(body: GenerateImageResponse, status = 200): Response {
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
    const body = (await req.json()) as GenerateImageRequest

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return jsonResponse({ success: false, error: 'invalid_prompt', message: 'prompt is required' }, 400)
    }

    const prompt = body.prompt.trim()
    const style = body.style ?? 'vivid'

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[generate-image] GEMINI_API_KEY not set in Edge Function secrets')
      return jsonResponse({ success: false, error: 'api_unavailable' }, 503)
    }

    const ai = new GoogleGenAI({ apiKey })

    const styledPrompt = style !== 'vivid'
      ? `${prompt} (style: ${style})`
      : prompt

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: styledPrompt,
      config: { numberOfImages: 1 },
    })

    const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes
    if (!imageBytes) {
      console.warn('[generate-image] No image bytes returned from Gemini', {
        agentId: body.agentId,
        promptLength: prompt.length,
      })
      return jsonResponse({ success: false, error: 'no_result', message: 'No image was generated' })
    }

    const imageDataUrl = `data:image/png;base64,${imageBytes}`
    return jsonResponse({ success: true, imageDataUrl })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    if (
      errorMessage.includes('safety') ||
      errorMessage.includes('blocked') ||
      errorMessage.includes('SAFETY') ||
      errorMessage.includes('policy') ||
      errorMessage.includes('PROHIBITED')
    ) {
      console.warn('[generate-image] Content policy block:', errorMessage)
      return jsonResponse({
        success: false,
        error: 'content_policy',
        message: 'Image generation was blocked by content safety policy',
      })
    }

    console.error('[generate-image] API error:', errorMessage)
    return jsonResponse({
      success: false,
      error: 'api_error',
      message: 'Image generation failed unexpectedly',
    })
  }
})
