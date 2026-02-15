/**
 * One-off test: invoke the generate-image Edge Function using the same
 * Supabase client the game server uses. Run from project root:
 *   npx tsx scripts/test-generate-image-edge.ts
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import 'dotenv/config'
import { getSupabaseClient } from '../src/config/supabase'

async function main() {
  console.log('[test-generate-image-edge] Using Supabase client from env...')
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('[test-generate-image-edge] No Supabase client (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    process.exit(1)
  }

  console.log('[test-generate-image-edge] Invoking generate-image with prompt "a single red apple on a white plate"...')
  const response = await supabase.functions.invoke('generate-image', {
    body: {
      prompt: 'a single red apple on a white plate',
      style: 'vivid',
      agentId: 'test-script',
    },
  })

  if (response.error) {
    console.error('[test-generate-image-edge] Invoke error:', response.error)
    process.exit(1)
  }

  const data = response.data as { success?: boolean; imageDataUrl?: string; error?: string; message?: string }
  if (data?.success === true && data?.imageDataUrl) {
    const prefix = data.imageDataUrl.slice(0, 50)
    console.log('[test-generate-image-edge] OK. success=true, imageDataUrl length:', data.imageDataUrl.length, 'prefix:', prefix + '...')
    console.log('[test-generate-image-edge] Edge function is reachable from our end.')
    process.exit(0)
  }

  console.error('[test-generate-image-edge] Unexpected response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

main().catch((err) => {
  console.error('[test-generate-image-edge]', err)
  process.exit(1)
})
