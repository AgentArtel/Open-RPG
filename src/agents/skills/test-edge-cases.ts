/**
 * Edge Case Tests for Skill System
 * 
 * Run with: npx tsx src/agents/skills/test-edge-cases.ts
 * 
 * Tests edge cases and error conditions:
 * - Invalid parameter types
 * - Boundary values (duration limits, etc.)
 * - Missing context data
 * - Duplicate skill registration
 * - Empty skill registry
 */

import { SkillRegistry } from './SkillRegistry'
import { moveSkill } from './skills/move'
import { saySkill } from './skills/say'
import { createLookSkill } from './skills/look'
import { waitSkill } from './skills/wait'
import { PerceptionEngine } from '../perception/PerceptionEngine'
import type { GameContext } from './types'

// Mock GameContext for testing
function createMockContext(): GameContext {
  return {
    event: {
      id: 'test-npc',
      moveRoutes: async () => true,
      showEmotionBubble: () => {},
      position: { x: 0, y: 0 },
    } as any,
    agentId: 'test-agent',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    nearbyPlayers: [],
  }
}

// Test 1: Duplicate skill registration
async function testDuplicateRegistration() {
  console.log('\n=== Edge Test 1: Duplicate Skill Registration ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  
  try {
    registry.register(moveSkill)
    console.log('  ❌ FAILED - Should have thrown error')
    return false
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('  ✅ PASSED - Threw error:', message)
    return message.includes('already registered')
  }
}

// Test 2: Invalid parameter types
async function testInvalidParameterTypes() {
  console.log('\n=== Edge Test 2: Invalid Parameter Types ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  registry.register(waitSkill)
  
  const context = createMockContext()
  
  // Test move with number instead of string
  const result1 = await registry.executeSkill('move', { direction: 123 }, context)
  console.log('  Move with number:', result1.success ? '❌' : '✅', result1.message)
  
  // Test wait with string instead of number
  const result2 = await registry.executeSkill('wait', { durationMs: 'invalid' }, context)
  console.log('  Wait with string:', result2.success ? '❌' : '✅', result2.message)
  
  // Test wait with negative number
  const result3 = await registry.executeSkill('wait', { durationMs: -100 }, context)
  console.log('  Wait with negative:', result3.success ? '❌' : '✅', result3.message)
  
  const passed = !result1.success && !result2.success && !result3.success
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 3: Boundary values (duration limits)
async function testBoundaryValues() {
  console.log('\n=== Edge Test 3: Boundary Values ===')
  
  const registry = new SkillRegistry()
  registry.register(waitSkill)
  
  const context = createMockContext()
  
  // Test minimum (0ms)
  const result1 = await registry.executeSkill('wait', { durationMs: 0 }, context)
  console.log('  Wait 0ms:', result1.success ? '✅' : '❌', result1.message)
  
  // Test maximum (10000ms)
  const result2 = await registry.executeSkill('wait', { durationMs: 10000 }, context)
  console.log('  Wait 10000ms:', result2.success ? '✅' : '❌', result2.message)
  
  // Test over maximum (10001ms)
  const result3 = await registry.executeSkill('wait', { durationMs: 10001 }, context)
  console.log('  Wait 10001ms:', result3.success ? '❌' : '✅', result3.message)
  
  // Test default (no parameter)
  const result4 = await registry.executeSkill('wait', {}, context)
  console.log('  Wait default:', result4.success ? '✅' : '❌', result4.message)
  
  const passed = 
    result1.success &&
    result2.success &&
    !result3.success &&
    result4.success
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 4: Empty skill registry
async function testEmptyRegistry() {
  console.log('\n=== Edge Test 4: Empty Skill Registry ===')
  
  const registry = new SkillRegistry()
  
  const tools = registry.getToolDefinitions()
  const all = registry.getAll()
  const notFound = registry.get('nonexistent')
  
  console.log('  Tool definitions count:', tools.length)
  console.log('  All skills count:', all.length)
  console.log('  Get nonexistent:', notFound === undefined ? '✅' : '❌')
  
  const passed = 
    tools.length === 0 &&
    all.length === 0 &&
    notFound === undefined
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 5: Execute nonexistent skill
async function testNonexistentSkill() {
  console.log('\n=== Edge Test 5: Execute Nonexistent Skill ===')
  
  const registry = new SkillRegistry()
  const context = createMockContext()
  
  const result = await registry.executeSkill('nonexistent', {}, context)
  
  console.log('  Result:', result.message)
  
  const passed = 
    !result.success &&
    result.error === 'skill_not_found' &&
    result.message.includes('not found')
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 6: Say skill with no nearby players
async function testSayNoPlayers() {
  console.log('\n=== Edge Test 6: Say Skill with No Nearby Players ===')
  
  const registry = new SkillRegistry()
  registry.register(saySkill)
  
  const context = createMockContext() // nearbyPlayers is empty array
  
  const result = await registry.executeSkill('say', { message: 'Hello' }, context)
  
  console.log('  Result:', result.message)
  
  const passed = 
    !result.success &&
    result.error === 'no_target' &&
    result.message.includes('No player nearby')
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 7: Move skill with all enum values
async function testMoveAllDirections() {
  console.log('\n=== Edge Test 7: Move Skill All Directions ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  
  const context = createMockContext()
  const directions = ['up', 'down', 'left', 'right']
  const results = []
  
  for (const dir of directions) {
    const result = await registry.executeSkill('move', { direction: dir }, context)
    results.push(result.success)
    console.log(`  ${dir}:`, result.success ? '✅' : '❌', result.message)
  }
  
  const passed = results.every(r => r === true)
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 8: Tool definitions with complex parameters
async function testComplexToolDefinitions() {
  console.log('\n=== Edge Test 8: Complex Tool Definitions ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  registry.register(saySkill)
  registry.register(waitSkill)
  
  const tools = registry.getToolDefinitions()
  
  // Verify all tools have correct structure
  const valid = tools.every(tool => {
    return (
      tool.type === 'function' &&
      typeof tool.function === 'object' &&
      typeof tool.function.name === 'string' &&
      typeof tool.function.description === 'string' &&
      tool.function.parameters.type === 'object' &&
      typeof tool.function.parameters.properties === 'object'
    )
  })
  
  console.log('  Tool count:', tools.length)
  console.log('  All tools valid structure:', valid ? '✅' : '❌')
  
  // Check say skill has optional target parameter
  const sayTool = tools.find(t => t.function.name === 'say')
  const hasTarget = sayTool?.function.parameters.properties?.target !== undefined
  const required = sayTool?.function.parameters.required || []
  const targetNotRequired = !required.includes('target')
  
  console.log('  Say has target param:', hasTarget ? '✅' : '❌')
  console.log('  Target is optional:', targetNotRequired ? '✅' : '❌')
  
  const passed = valid && hasTarget && targetNotRequired
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Run all edge case tests
async function runAllEdgeCaseTests() {
  console.log('🧪 Running Skill System Edge Case Tests\n')
  console.log('='.repeat(60))

  const results = await Promise.all([
    testDuplicateRegistration(),
    testInvalidParameterTypes(),
    testBoundaryValues(),
    testEmptyRegistry(),
    testNonexistentSkill(),
    testSayNoPlayers(),
    testMoveAllDirections(),
    testComplexToolDefinitions(),
  ])

  const passed = results.filter(r => r).length
  const total = results.length

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('✅ All edge case tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some edge case tests failed')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runAllEdgeCaseTests().catch(err => {
    console.error('Test error:', err)
    process.exit(1)
  })
}

