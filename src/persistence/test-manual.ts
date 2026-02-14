/**
 * Manual Test Script for Player State Persistence (TASK-013)
 *
 * Run with: npx tsx src/persistence/test-manual.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or env).
 * If not set, the script exits with code 0 and a skip message.
 *
 * Verifies:
 * - PlayerStateManager save → load round-trip
 * - deletePlayer cleanup
 */

import 'dotenv/config'
import { getSupabaseClient } from '../config/supabase'
import { createPlayerStateManager } from './index'
import type { PlayerState } from './PlayerStateManager'

const TEST_PLAYER_ID = 'test-persistence-manual'

function makeTestState(overrides?: Partial<PlayerState>): PlayerState {
  return {
    playerId: TEST_PLAYER_ID,
    name: 'TestPlayer',
    mapId: 'simplemap',
    positionX: 100,
    positionY: 200,
    direction: 2,
    stateData: {},
    ...overrides,
  }
}

async function run(): Promise<void> {
  console.log('\n=== Player State Persistence (TASK-013) Manual Test ===\n')

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.log(
      '  ⏭️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Skip (no failure).'
    )
    console.log('  Set them in .env to run this test against Supabase.\n')
    process.exit(0)
  }

  const manager = createPlayerStateManager()

  // 1. Save
  console.log('  1. Save test player state...')
  const state = makeTestState()
  await manager.savePlayer(state)
  console.log('     Saved:', state.mapId, state.positionX, state.positionY)

  // 2. Load
  console.log('  2. Load back...')
  const loaded = await manager.loadPlayer(TEST_PLAYER_ID)
  if (!loaded) {
    console.error('     ❌ Load returned null')
    process.exit(1)
  }
  if (
    loaded.playerId !== state.playerId ||
    loaded.name !== state.name ||
    loaded.mapId !== state.mapId ||
    loaded.positionX !== state.positionX ||
    loaded.positionY !== state.positionY ||
    loaded.direction !== state.direction
  ) {
    console.error('     ❌ Loaded state does not match saved:', { saved: state, loaded })
    process.exit(1)
  }
  console.log('     Loaded matches saved ✅')

  // 3. Delete (cleanup)
  console.log('  3. Delete test row (cleanup)...')
  await manager.deletePlayer(TEST_PLAYER_ID)
  const afterDelete = await manager.loadPlayer(TEST_PLAYER_ID)
  if (afterDelete !== null) {
    console.error('     ❌ Row still exists after delete')
    process.exit(1)
  }
  console.log('     Deleted ✅')

  console.log('\n  ✅ All checks passed.\n')
}

run().catch((err) => {
  console.error('  ❌ Test failed:', err)
  process.exit(1)
})
