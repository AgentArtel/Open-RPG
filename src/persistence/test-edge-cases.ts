/**
 * Edge Case Test Script for Player State Persistence (TASK-013)
 *
 * Run with: npx tsx src/persistence/test-edge-cases.ts
 *
 * Tests robustness without requiring Supabase for most cases:
 * - Null client (no Supabase): load returns null, save/delete no-op and never throw
 * - Empty string playerId
 * - Edge values (zero/negative coords, empty name/mapId)
 * - Optional: with Supabase, load nonexistent returns null
 */

import 'dotenv/config'
import { getSupabaseClient } from '../config/supabase'
import { PlayerStateManager } from './PlayerStateManager'
import type { PlayerState } from './PlayerStateManager'

function makeState(overrides: Partial<PlayerState>): PlayerState {
  return {
    playerId: 'edge-test-player',
    name: 'Test',
    mapId: 'simplemap',
    positionX: 0,
    positionY: 0,
    direction: 0,
    stateData: {},
    ...overrides,
  }
}

// --- Null client (no Supabase): manager never throws, load returns null ---

async function testNullClientLoadReturnsNull(): Promise<boolean> {
  console.log('\n=== Edge Test 1: Null Client — load returns null ===')
  const manager = new PlayerStateManager(null)
  const result = await manager.loadPlayer('any-id')
  const passed = result === null
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

async function testNullClientSaveDoesNotThrow(): Promise<boolean> {
  console.log('\n=== Edge Test 2: Null Client — save does not throw ===')
  const manager = new PlayerStateManager(null)
  try {
    await manager.savePlayer(makeState({ playerId: 'noop-save' }))
    console.log('  ✅ PASSED')
    return true
  } catch {
    console.log('  ❌ FAILED')
    return false
  }
}

async function testNullClientDeleteDoesNotThrow(): Promise<boolean> {
  console.log('\n=== Edge Test 3: Null Client — delete does not throw ===')
  const manager = new PlayerStateManager(null)
  try {
    await manager.deletePlayer('any-id')
    console.log('  ✅ PASSED')
    return true
  } catch {
    console.log('  ❌ FAILED')
    return false
  }
}

async function testLoadEmptyPlayerId(): Promise<boolean> {
  console.log('\n=== Edge Test 4: Load with empty string playerId ===')
  const manager = new PlayerStateManager(null)
  const result = await manager.loadPlayer('')
  const passed = result === null
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

async function testSaveEdgeValuesNoThrow(): Promise<boolean> {
  console.log('\n=== Edge Test 5: Save with edge values (zero, empty, negative) — no throw ===')
  const manager = new PlayerStateManager(null)
  try {
    await manager.savePlayer(makeState({
      playerId: 'edge-vals',
      name: '',
      mapId: '',
      positionX: -100,
      positionY: 0,
      direction: -1,
      stateData: {},
    }))
    console.log('  ✅ PASSED')
    return true
  } catch {
    console.log('  ❌ FAILED')
    return false
  }
}

async function testSaveStateDataRoundTrip(): Promise<boolean> {
  console.log('\n=== Edge Test 6: stateData with nested object (no Supabase: no throw) ===')
  const manager = new PlayerStateManager(null)
  try {
    await manager.savePlayer(makeState({
      playerId: 'state-data',
      stateData: { key: 'value', nested: { a: 1 } },
    }))
    console.log('  ✅ PASSED')
    return true
  } catch {
    console.log('  ❌ FAILED')
    return false
  }
}

async function testLoadNonexistentPlayerWhenSupabaseConfigured(): Promise<boolean> {
  console.log('\n=== Edge Test 7: Load nonexistent player (Supabase optional) ===')
  const supabase = getSupabaseClient()
  const manager = new PlayerStateManager(supabase)
  // Use a unique id that we never save — should get null (not found or error path)
  const nonexistentId = 'edge-nonexistent-' + Date.now()
  const result = await manager.loadPlayer(nonexistentId)
  const passed = result === null
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

async function runAllEdgeTests(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('  Player State Persistence — Edge Case Tests (TASK-013)')
  console.log('='.repeat(60))

  const results = await Promise.all([
    testNullClientLoadReturnsNull(),
    testNullClientSaveDoesNotThrow(),
    testNullClientDeleteDoesNotThrow(),
    testLoadEmptyPlayerId(),
    testSaveEdgeValuesNoThrow(),
    testSaveStateDataRoundTrip(),
    testLoadNonexistentPlayerWhenSupabaseConfigured(),
  ])

  const passed = results.filter(Boolean).length
  const total = results.length

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Edge Test Results: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('✅ All edge case tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some edge case tests failed')
    process.exit(1)
  }
}

runAllEdgeTests().catch((err) => {
  console.error('Edge test error:', err)
  process.exit(1)
})
