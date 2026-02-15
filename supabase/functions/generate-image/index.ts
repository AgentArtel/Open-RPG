/**
 * Supabase Edge Function: generate-image
 *
 * Receives { prompt, style?, agentId? } from the game server,
 * calls Gemini's image generation API via @google/genai,
 * and returns { success, imageDataUrl? | imageUrl?, error? }.
 *
 * The GEMINI_API_KEY secret lives only here in Edge Function secrets —
 * the game server never sees it.
 *
 * Deploy: supabase functions deploy generate-image
 * Secrets: supabase secrets set GEMINI_API_KEY=your-key
 *
 * @see .cursor/plans/task-018_edge_image_gen_1f807fa9.plan.md
 */

import { GoogleGenAI } from 'npm:@google/genai'

// ---------------------------------------------------------------------------
// CORS headers — allow the game server origin
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405)
  }

  try {
    // 1. Parse request body
    const body = (await req.json()) as GenerateImageRequest

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return jsonResponse({ success: false, error: 'invalid_prompt', message: 'prompt is required' }, 400)
    }

    const prompt = body.prompt.trim()
    const style = body.style ?? 'vivid'

    // 2. Check for API key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[generate-image] GEMINI_API_KEY not set in Edge Function secrets')
      return jsonResponse({ success: false, error: 'api_unavailable' }, 503)
    }

    // 3. Create Gemini client
    const ai = new GoogleGenAI({ apiKey })

    // 4. Build the styled prompt
    const styledPrompt = style !== 'vivid'
      ? `${prompt} (style: ${style})`
      : prompt

    // 5. Call image generation — stable Imagen model
    //    Using generateImages from the @google/genai SDK.
    //    Model: imagen-4.0-generate-001 (current stable Imagen model)
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: styledPrompt,
      config: {
        numberOfImages: 1,
      },
    })

    // 6. Extract image bytes from response
    const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes
    if (!imageBytes) {
      console.warn('[generate-image] No image bytes returned from Gemini', {
        agentId: body.agentId,
        promptLength: prompt.length,
      })
      return jsonResponse({ success: false, error: 'no_result', message: 'No image was generated' })
    }

    // 7. Return as data URL (MVP — no Supabase Storage upload)
    const imageDataUrl = `data:image/png;base64,${imageBytes}`

    return jsonResponse({
      success: true,
      imageDataUrl,
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    // Check for content/safety policy errors
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

    // Generic API error
    console.error('[generate-image] API error:', errorMessage)
    return jsonResponse({
      success: false,
      error: 'api_error',
      message: 'Image generation failed unexpectedly',
    })
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a JSON response with CORS headers.
 */
function jsonResponse(body: GenerateImageResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}
