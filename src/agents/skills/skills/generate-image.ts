/**
 * Generate Image Skill
 *
 * Token-gated skill that invokes the Supabase Edge Function `generate-image`
 * to create images via Gemini. The NPC must have 'image-gen-token' in
 * inventory to use this skill.
 *
 * Flow:
 *   1. Check token gate (NPC has 'image-gen-token' item)
 *   2. Find target player (nearest)
 *   3. Call Supabase Edge Function with 10s timeout
 *   4. Store result in player variable PHOTOS
 *   5. Return in-character SkillResult
 *
 * No Gemini dependency in the game server — all image generation
 * happens on the edge.
 *
 * @see .cursor/plans/task-018_edge_image_gen_1f807fa9.plan.md
 */

import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'
import { getSupabaseClient } from '../../../config/supabase'
import type { IAgentSkill, GameContext, SkillResult } from '../types'
import type { SkillPlugin } from '../plugin'

const LOG_PREFIX = '[Skill:generate_image]'

/** Shape of a photo entry stored in the player's PHOTOS variable. */
interface PhotoEntry {
  url: string
  prompt: string
  generatedBy: string
  timestamp: number
}

/** Shape of the Edge Function response. */
interface EdgeFunctionResponse {
  success: boolean
  imageDataUrl?: string
  imageUrl?: string
  error?: string
  message?: string
}

/**
 * Map Edge Function error codes to in-character photographer dialogue.
 */
function getInCharacterError(errorCode: string): string {
  switch (errorCode) {
    case 'content_policy':
      return "I can't develop that image; my lens refuses."
    case 'no_result':
      return 'The exposure came out blank... the light was wrong.'
    case 'api_unavailable':
      return 'My darkroom chemicals have gone dry. Try again later.'
    case 'api_error':
      return 'Something went wrong in the darkroom. The film was ruined.'
    default:
      return 'The photograph did not turn out. Perhaps another time.'
  }
}

export const generateImageSkill: IAgentSkill = {
  name: 'generate_image',
  description:
    'Generate an image from a text description. Requires the Mystical Lens (image-gen-token) in inventory.',
  parameters: {
    prompt: {
      type: 'string',
      description: 'A description of what to photograph or create an image of',
      required: true,
    },
    style: {
      type: 'string',
      description: 'Visual style for the image (e.g. "vivid", "film noir", "watercolor")',
      required: false,
    },
  },

  async execute(params, context): Promise<SkillResult> {
    try {
      // 1. Token gate: NPC must have 'image-gen-token' item
      const hasToken = (context.event as any).hasItem?.('image-gen-token')
      if (!hasToken) {
        return {
          success: false,
          message: "I don't have my Mystical Lens... I can't take photographs without it.",
          error: 'missing_token',
        }
      }

      // 2. Find target player (closest nearby)
      const targetPlayer = context.nearbyPlayers[0]?.player
      if (!targetPlayer) {
        return {
          success: false,
          message: 'There is no one here to show the photograph to.',
          error: 'no_target',
        }
      }

      // 3. Check Supabase client availability
      const supabase = getSupabaseClient()
      if (!supabase) {
        return {
          success: false,
          message: 'The lens is clouded today... I cannot focus.',
          error: 'supabase_unavailable',
        }
      }

      // 4. Build request body
      const prompt = String(params.prompt).trim()
      if (!prompt) {
        return {
          success: false,
          message: 'I need to know what to photograph. Describe the scene!',
          error: 'invalid_prompt',
        }
      }

      const style = params.style ? String(params.style) : 'vivid'

      // Show waiting emotion bubble on the NPC while the edge function runs
      try {
        ;(context.event as any).showEmotionBubble?.(EmotionBubble.ThreeDot)
      } catch {
        // Plugin may be unavailable; continue without bubble
      }

      // 5. Invoke Edge Function with 10s timeout via AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000)

      let data: EdgeFunctionResponse | null = null
      let invokeError: string | null = null

      try {
        const response = await supabase.functions.invoke('generate-image', {
          body: {
            prompt,
            style,
            agentId: context.agentId,
          },
          // Note: Supabase JS v2 doesn't directly support AbortSignal in invoke,
          // but we wrap it with a race against the timeout.
        })

        // supabase.functions.invoke returns { data, error }
        if (response.error) {
          invokeError = response.error.message ?? String(response.error)
        } else {
          data = response.data as EdgeFunctionResponse
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`${LOG_PREFIX} Edge function timed out after 10s`, {
            agentId: context.agentId,
          })
          return {
            success: false,
            message: 'The exposure took too long... the film was overexposed.',
            error: 'timeout',
          }
        }
        invokeError = err instanceof Error ? err.message : String(err)
      } finally {
        clearTimeout(timeoutId)
      }

      // 6. Handle network/invocation errors
      if (invokeError) {
        console.warn(`${LOG_PREFIX} Edge function invocation failed:`, invokeError)
        return {
          success: false,
          message: 'The darkroom is having troubles. I could not develop the image.',
          error: 'invocation_error',
        }
      }

      // 7. Handle Edge Function response
      if (!data) {
        return {
          success: false,
          message: 'No response came back from the darkroom.',
          error: 'no_response',
        }
      }

      if (data.success === true && (data.imageDataUrl || data.imageUrl)) {
        // Success! Store the photo in the player's PHOTOS variable
        const photoUrl = data.imageDataUrl || data.imageUrl!
        const existingPhotos: PhotoEntry[] = targetPlayer.getVariable('PHOTOS') || []

        const newPhoto: PhotoEntry = {
          url: photoUrl,
          prompt,
          generatedBy: context.agentId,
          timestamp: Date.now(),
        }

        const updatedPhotos = [...existingPhotos, newPhoto]
        targetPlayer.setVariable('PHOTOS', updatedPhotos)

        console.log(
          `${LOG_PREFIX} Photo generated for player. Total photos: ${updatedPhotos.length}`,
          { agentId: context.agentId, prompt: prompt.slice(0, 50) }
        )

        // Open photo-result GUI so the player sees the image
        try {
          targetPlayer.gui('photo-result').open(
            { imageDataUrl: photoUrl, prompt },
            { blockPlayerInput: true }
          )
        } catch (guiErr) {
          console.warn(`${LOG_PREFIX} Could not open photo-result GUI:`, guiErr)
        }

        return {
          success: true,
          message: `*click* I captured it! "${prompt}" — the image is yours now. (Photo #${updatedPhotos.length})`,
          data: {
            photoCount: updatedPhotos.length,
            prompt,
          },
        }
      }

      // Edge Function returned success: false — map to in-character message
      const errorCode = data.error ?? 'unknown'
      const inCharacterMsg = getInCharacterError(errorCode)
      console.warn(`${LOG_PREFIX} Edge function returned error:`, {
        error: errorCode,
        message: data.message,
        agentId: context.agentId,
      })

      return {
        success: false,
        message: inCharacterMsg,
        error: errorCode,
      }
    } catch (err: unknown) {
      // Catch-all: agents must never crash the game server
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Unexpected error:`, errorMessage)
      return {
        success: false,
        message: 'Something went wrong with the camera. The photograph was lost.',
        error: 'execution_error',
      }
    }
  },
}

// --- Skill Plugin (modular registration) ---
export const skillPlugin: SkillPlugin = {
  name: 'generate_image',
  create: () => generateImageSkill,
  requiredItem: 'image-gen-token',
  category: 'api',
}
