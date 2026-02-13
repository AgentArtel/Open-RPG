/**
 * Manual Test Script for PerceptionEngine
 * 
 * Run with: npx tsx src/agents/perception/test-manual.ts
 * 
 * This script tests the PerceptionEngine with mock data to verify:
 * - Distance calculation (pixel to tile conversion)
 * - Direction calculation (all 8 cardinals)
 * - Entity sorting and capping
 * - Token budget enforcement
 * - Summary generation
 */

import { PerceptionEngine } from './PerceptionEngine'
import type { PerceptionContext } from './types'
import type { Position } from '../bridge/types'

// Helper to create mock entities
function createMockEntity(
  id: string,
  name: string,
  type: 'player' | 'npc' | 'object',
  position: Position
) {
  return {
    id,
    name,
    type,
    position,
    // These will be calculated by PerceptionEngine
    distance: 0,
    direction: '',
  }
}

// Test 1: Basic functionality with single entity
async function testBasicFunctionality() {
  console.log('\n=== Test 1: Basic Functionality ===')
  
  const context: PerceptionContext = {
    agentId: 'test-npc',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    rawEntities: [
      createMockEntity('player-1', 'Alex', 'player', { x: 32, y: 0 }), // 1 tile east
    ],
  }

  const engine = new PerceptionEngine()
  const snapshot = await engine.generateSnapshot(context)

  console.log('Summary:', snapshot.summary)
  console.log('Entities:', snapshot.entities.length)
  console.log('Token Estimate:', snapshot.tokenEstimate)
  console.log('Distance:', snapshot.entities[0]?.distance)
  console.log('Direction:', snapshot.entities[0]?.direction)

  // Assertions
  const passed = 
    snapshot.tokenEstimate <= 300 &&
    snapshot.entities.length === 1 &&
    snapshot.entities[0].distance === 1 &&
    snapshot.entities[0].direction === 'east' &&
    snapshot.summary.includes('Alex') &&
    snapshot.summary.includes('east')

  console.log(passed ? '✅ PASSED' : '❌ FAILED')
  return passed
}

// Test 2: All 8 cardinal directions
async function testAllDirections() {
  console.log('\n=== Test 2: All 8 Cardinal Directions ===')
  
  // Test each direction separately (since we cap at 5 entities)
  const npcPos = { x: 0, y: 0 }
  const directions = [
    { pos: { x: 32, y: 0 }, expected: 'east' },
    { pos: { x: 32, y: -32 }, expected: 'northeast' },
    { pos: { x: 0, y: -32 }, expected: 'north' },
    { pos: { x: -32, y: -32 }, expected: 'northwest' },
    { pos: { x: -32, y: 0 }, expected: 'west' },
    { pos: { x: -32, y: 32 }, expected: 'southwest' },
    { pos: { x: 0, y: 32 }, expected: 'south' },
    { pos: { x: 32, y: 32 }, expected: 'southeast' },
  ]

  const engine = new PerceptionEngine()
  let passed = true

  // Test each direction individually
  for (const dir of directions) {
    const context: PerceptionContext = {
      agentId: 'test-npc',
      position: npcPos,
      map: { id: 'simplemap', name: 'Simple Map' },
      rawEntities: [createMockEntity('test', 'TestEntity', 'player', dir.pos)],
    }

    const snapshot = await engine.generateSnapshot(context)
    const actual = snapshot.entities[0]?.direction
    const match = actual === dir.expected
    console.log(`  ${dir.expected}: ${match ? '✅' : '❌'} (got: ${actual})`)
    if (!match) passed = false
  }

  console.log(passed ? '✅ PASSED' : '❌ FAILED')
  return passed
}

// Test 3: Entity sorting and capping
async function testSortingAndCapping() {
  console.log('\n=== Test 3: Entity Sorting and Capping ===')
  
  const context: PerceptionContext = {
    agentId: 'test-npc',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    rawEntities: [
      createMockEntity('far', 'FarEntity', 'player', { x: 320, y: 0 }), // 10 tiles
      createMockEntity('close', 'CloseEntity', 'player', { x: 32, y: 0 }), // 1 tile
      createMockEntity('medium', 'MediumEntity', 'player', { x: 160, y: 0 }), // 5 tiles
      createMockEntity('very-far-1', 'VeryFar1', 'player', { x: 640, y: 0 }), // 20 tiles
      createMockEntity('very-far-2', 'VeryFar2', 'player', { x: 800, y: 0 }), // 25 tiles
      createMockEntity('very-far-3', 'VeryFar3', 'player', { x: 960, y: 0 }), // 30 tiles (should be capped)
    ],
  }

  const engine = new PerceptionEngine()
  const snapshot = await engine.generateSnapshot(context)

  console.log('Entities returned:', snapshot.entities.length)
  console.log('Distances:', snapshot.entities.map(e => `${e.name}: ${e.distance}`))

  // Should be capped at 5, sorted by distance
  const passed =
    snapshot.entities.length === 5 &&
    snapshot.entities[0].name === 'CloseEntity' &&
    snapshot.entities[0].distance === 1 &&
    snapshot.entities[1].name === 'MediumEntity' &&
    snapshot.entities[1].distance === 5

  console.log(passed ? '✅ PASSED' : '❌ FAILED')
  return passed
}

// Test 4: Empty entities
async function testEmptyEntities() {
  console.log('\n=== Test 4: Empty Entities ===')
  
  const context: PerceptionContext = {
    agentId: 'test-npc',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    rawEntities: [],
  }

  const engine = new PerceptionEngine()
  const snapshot = await engine.generateSnapshot(context)

  console.log('Summary:', snapshot.summary)
  console.log('Entities:', snapshot.entities.length)
  console.log('Token Estimate:', snapshot.tokenEstimate)

  const passed =
    snapshot.entities.length === 0 &&
    snapshot.summary.includes('quiet') &&
    snapshot.tokenEstimate <= 300

  console.log(passed ? '✅ PASSED' : '❌ FAILED')
  return passed
}

// Test 5: Token budget enforcement
async function testTokenBudget() {
  console.log('\n=== Test 5: Token Budget Enforcement ===')
  
  // Create many entities with long names to exceed token budget
  const entities = Array.from({ length: 20 }, (_, i) =>
    createMockEntity(
      `entity-${i}`,
      `VeryLongEntityName${i}ThatMakesTheTokenCountHigh`,
      'player',
      { x: (i + 1) * 32, y: 0 }
    )
  )

  const context: PerceptionContext = {
    agentId: 'test-npc',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    rawEntities: entities,
  }

  const engine = new PerceptionEngine()
  const snapshot = await engine.generateSnapshot(context)

  console.log('Token Estimate:', snapshot.tokenEstimate)
  console.log('Entities after enforcement:', snapshot.entities.length)
  console.log('Summary length:', snapshot.summary.length)

  const passed = snapshot.tokenEstimate <= 300

  console.log(passed ? '✅ PASSED' : '❌ FAILED')
  return passed
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running PerceptionEngine Manual Tests\n')
  console.log('=' .repeat(50))

  const results = await Promise.all([
    testBasicFunctionality(),
    testAllDirections(),
    testSortingAndCapping(),
    testEmptyEntities(),
    testTokenBudget(),
  ])

  const passed = results.filter(r => r).length
  const total = results.length

  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('✅ All tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Test error:', err)
    process.exit(1)
  })
}

