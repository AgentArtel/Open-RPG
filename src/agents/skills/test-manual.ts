/**
 * Manual Test Script for Skill System
 * 
 * Run with: npx tsx src/agents/skills/test-manual.ts
 * 
 * This script tests the Skill System with mock data to verify:
 * - SkillRegistry registration and retrieval
 * - OpenAI tool definition conversion
 * - Parameter validation
 * - Skill execution (with mock GameContext)
 */

import { SkillRegistry } from './SkillRegistry'
import { moveSkill } from './skills/move'
import { saySkill } from './skills/say'
import { createLookSkill } from './skills/look'
import { waitSkill } from './skills/wait'
import { PerceptionEngine } from '../perception/PerceptionEngine'
import type { GameContext } from './types'

// Note: emoteSkill is not imported here because @rpgjs/plugin-emotion-bubbles
// uses Vite-specific imports that don't work in Node.js. It will be tested
// in the actual game environment.

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

// Test 1: SkillRegistry registration
async function testRegistryRegistration() {
  console.log('\n=== Test 1: SkillRegistry Registration ===')
  
  const registry = new SkillRegistry()
  
  // Register skills (excluding emote - requires Vite environment)
  registry.register(moveSkill)
  registry.register(saySkill)
  registry.register(waitSkill)
  
  // Create look skill with PerceptionEngine
  const perceptionEngine = new PerceptionEngine()
  const lookSkill = createLookSkill(perceptionEngine)
  registry.register(lookSkill)
  
  console.log('  Registered skills:', registry.getAll().map(s => s.name).join(', '))
  
  // Test retrieval
  const move = registry.get('move')
  const say = registry.get('say')
  const notFound = registry.get('nonexistent')
  
  const passed = 
    move?.name === 'move' &&
    say?.name === 'say' &&
    notFound === undefined &&
    registry.getAll().length === 4 // 4 skills (emote tested in game)
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 2: OpenAI tool definition format
async function testToolDefinitions() {
  console.log('\n=== Test 2: OpenAI Tool Definition Format ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  registry.register(saySkill)
  
  const tools = registry.getToolDefinitions()
  
  console.log('  Tool count:', tools.length)
  console.log('  First tool type:', tools[0]?.type)
  console.log('  First tool function name:', tools[0]?.function?.name)
  console.log('  First tool parameters:', JSON.stringify(tools[0]?.function?.parameters, null, 2))
  
  const passed = 
    tools.length === 2 &&
    tools[0].type === 'function' &&
    tools[0].function.name === 'move' &&
    tools[0].function.parameters.type === 'object' &&
    Array.isArray(tools[0].function.parameters.properties) === false &&
    typeof tools[0].function.parameters.properties === 'object'
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 3: Parameter validation
async function testParameterValidation() {
  console.log('\n=== Test 3: Parameter Validation ===')
  
  const registry = new SkillRegistry()
  registry.register(moveSkill)
  registry.register(waitSkill)
  
  const context = createMockContext()
  
  // Test missing required parameter
  const result1 = await registry.executeSkill('move', {}, context)
  console.log('  Missing direction:', result1.success ? '❌' : '✅', result1.message)
  
  // Test invalid enum value
  const result2 = await registry.executeSkill('move', { direction: 'invalid' }, context)
  console.log('  Invalid direction:', result2.success ? '❌' : '✅', result2.message)
  
  // Test valid parameters
  const result3 = await registry.executeSkill('wait', { durationMs: 100 }, context)
  console.log('  Valid wait:', result3.success ? '✅' : '❌', result3.message)
  
  const passed = 
    !result1.success &&
    !result2.success &&
    result3.success
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 4: Skill execution (mock)
async function testSkillExecution() {
  console.log('\n=== Test 4: Skill Execution (Mock) ===')
  
  const registry = new SkillRegistry()
  registry.register(waitSkill)
  
  const context = createMockContext()
  
  const startTime = Date.now()
  const result = await registry.executeSkill('wait', { durationMs: 100 }, context)
  const endTime = Date.now()
  const duration = endTime - startTime
  
  console.log('  Result:', result.message)
  console.log('  Duration:', duration, 'ms')
  
  const passed = 
    result.success &&
    duration >= 90 && // Allow some variance
    duration <= 150
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Test 5: All skills registered
async function testAllSkillsRegistered() {
  console.log('\n=== Test 5: All Skills Registered ===')
  
  const registry = new SkillRegistry()
  const perceptionEngine = new PerceptionEngine()
  
  registry.register(moveSkill)
  registry.register(saySkill)
  registry.register(createLookSkill(perceptionEngine))
  registry.register(waitSkill)
  // Note: emote skill not tested here (requires Vite environment)
  
  const expected = ['look', 'move', 'say', 'wait'] // 4 skills (emote tested in game)
  const actual = registry.getAll().map(s => s.name).sort()
  
  console.log('  Expected:', expected.join(', '))
  console.log('  Actual:', actual.join(', '))
  
  const passed = 
    actual.length === expected.length &&
    expected.every(name => actual.includes(name))
  
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running Skill System Manual Tests\n')
  console.log('='.repeat(60))

  const results = await Promise.all([
    testRegistryRegistration(),
    testToolDefinitions(),
    testParameterValidation(),
    testSkillExecution(),
    testAllSkillsRegistered(),
  ])

  const passed = results.filter(r => r).length
  const total = results.length

  console.log('\n' + '='.repeat(60))
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

