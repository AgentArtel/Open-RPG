/**
 * Manual Test Script for Core Agent System (LaneQueue, Memory, AgentRunner)
 *
 * Run with: npx tsx src/agents/core/test-manual.ts
 *
 * Tests LaneQueue, InMemoryAgentMemory, and AgentRunner with mock LLM and
 * context provider. No real API calls.
 */

import { LaneQueue } from './LaneQueue'
import { InMemoryAgentMemory } from '../memory/InMemoryAgentMemory'
import { AgentRunner } from './AgentRunner'
import { PerceptionEngine } from '../perception/PerceptionEngine'
import { SkillRegistry } from '../skills/SkillRegistry'
import { waitSkill } from '../skills/skills/wait'
import type {
  AgentConfig,
  AgentEvent,
  RunContext,
  LLMResponse,
  ILLMClient,
  LLMMessage,
  LLMCompletionOptions,
} from './types'
import type { PerceptionContext } from '../perception/types'
import type { GameContext } from '../skills/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockAgentConfig(): AgentConfig {
  return {
    id: 'test-agent',
    name: 'Test NPC',
    graphic: 'male',
    personality: 'You are a friendly test NPC.',
    model: { idle: 'kimi-k2-0905-chat', conversation: 'kimi-k2.5' },
    skills: ['wait'],
    spawn: { map: 'simplemap', x: 0, y: 0 },
    behavior: {
      idleInterval: 15000,
      patrolRadius: 3,
      greetOnProximity: true,
    },
  }
}

function createMockGameContext(): GameContext {
  return {
    event: { id: 'test-npc', position: { x: 0, y: 0 }, moveRoutes: async () => true } as any,
    agentId: 'test-agent',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    nearbyPlayers: [],
  }
}

function createMockPerceptionContext(): PerceptionContext {
  return {
    agentId: 'test-agent',
    position: { x: 0, y: 0 },
    map: { id: 'simplemap', name: 'Simple Map' },
    rawEntities: [],
  }
}

/** LLM client that returns a fixed text response (no API call). */
function createMockLLMClient(responseText: string): ILLMClient {
  return {
    async complete(
      _messages: ReadonlyArray<LLMMessage>,
      _options: LLMCompletionOptions
    ): Promise<LLMResponse> {
      return {
        text: responseText,
        toolCalls: [],
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 5 },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Test 1: LaneQueue
// ---------------------------------------------------------------------------

async function testLaneQueue() {
  console.log('\n=== Test 1: LaneQueue ===')

  const queue = new LaneQueue()
  const order: number[] = []

  await queue.enqueue('agent-1', async () => {
    order.push(1)
    await new Promise((r) => setTimeout(r, 20))
  })
  await queue.enqueue('agent-1', async () => {
    order.push(2)
  })

  const processing = queue.isProcessing('agent-1')
  const length = queue.getQueueLength('agent-1')

  console.log('  Order of execution:', order.join(', '))
  console.log('  isProcessing after done:', processing)
  console.log('  getQueueLength after done:', length)

  const passed = order[0] === 1 && order[1] === 2 && !processing && length === 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Test 2: InMemoryAgentMemory
// ---------------------------------------------------------------------------

async function testInMemoryAgentMemory() {
  console.log('\n=== Test 2: InMemoryAgentMemory ===')

  const memory = new InMemoryAgentMemory({ maxMessages: 5 })

  memory.addMessage({
    role: 'user',
    content: 'Hello',
    timestamp: Date.now(),
  })
  memory.addMessage({
    role: 'assistant',
    content: 'Hi there!',
    timestamp: Date.now(),
  })

  const count = memory.getMessageCount()
  const recent = memory.getRecentContext(100)
  const all = memory.getAllMessages()

  console.log('  Message count:', count)
  console.log('  Recent context (100 tokens):', recent.length, 'messages')
  console.log('  All messages:', all.length)

  memory.clear()
  const afterClear = memory.getMessageCount()

  console.log('  After clear:', afterClear)

  const passed =
    count === 2 &&
    recent.length >= 1 &&
    all.length === 2 &&
    afterClear === 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Test 3: AgentRunner buildSystemPrompt
// ---------------------------------------------------------------------------

async function testBuildSystemPrompt() {
  console.log('\n=== Test 3: AgentRunner.buildSystemPrompt ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  const mockLlm = createMockLLMClient('')
  const getContext = async (_e: AgentEvent): Promise<RunContext> => ({
    perceptionContext: createMockPerceptionContext(),
    gameContext: createMockGameContext(),
  })

  const runner = new AgentRunner(
    config,
    perception,
    skills,
    memory,
    mockLlm,
    getContext
  )

  const snapshot = await perception.generateSnapshot(createMockPerceptionContext())
  const prompt = runner.buildSystemPrompt(snapshot)

  const hasIdentity = prompt.includes('Identity') && prompt.includes(config.personality)
  const hasWorld = prompt.includes('World') && prompt.includes(snapshot.summary)
  const hasSkills = prompt.includes('Skills') && prompt.includes('wait')
  const hasRules = prompt.includes('Rules') && prompt.includes('200 characters')

  console.log('  Has Identity section:', hasIdentity ? '✅' : '❌')
  console.log('  Has World section:', hasWorld ? '✅' : '❌')
  console.log('  Has Skills section:', hasSkills ? '✅' : '❌')
  console.log('  Has Rules section:', hasRules ? '✅' : '❌')

  const passed = hasIdentity && hasWorld && hasSkills && hasRules
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Test 4: AgentRunner run (mock LLM)
// ---------------------------------------------------------------------------

async function testAgentRunnerRun() {
  console.log('\n=== Test 4: AgentRunner.run (mock LLM) ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  const responseText = 'I am just standing here.'
  const mockLlm = createMockLLMClient(responseText)
  const getContext = async (_e: AgentEvent): Promise<RunContext> => ({
    perceptionContext: createMockPerceptionContext(),
    gameContext: createMockGameContext(),
  })

  const runner = new AgentRunner(
    config,
    perception,
    skills,
    memory,
    mockLlm,
    getContext
  )

  const event: AgentEvent = {
    type: 'idle_tick',
    timestamp: Date.now(),
  }

  const result = await runner.run(event)

  console.log('  success:', result.success)
  console.log('  text:', result.text)
  console.log('  durationMs:', result.durationMs)
  console.log('  memory after run:', memory.getMessageCount())

  const passed =
    result.success &&
    result.text === responseText &&
    result.skillResults.length === 0 &&
    memory.getMessageCount() === 1 &&
    memory.getAllMessages()[0].content === responseText

  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Test 5: LaneQueue serialization (isProcessing during run)
// ---------------------------------------------------------------------------

async function testLaneQueueSerialization() {
  console.log('\n=== Test 5: LaneQueue serialization ===')

  const queue = new LaneQueue()
  let firstFinished = false

  const firstDone = queue.enqueue('agent-1', async () => {
    await new Promise((r) => setTimeout(r, 30))
    firstFinished = true
  })

  let secondSawFirstFinished = false
  queue.enqueue('agent-1', async () => {
    secondSawFirstFinished = firstFinished
  })

  await firstDone

  console.log('  Second task saw first finished:', secondSawFirstFinished ? '✅' : '❌')

  const passed = secondSawFirstFinished
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------

async function runAllTests() {
  console.log('🧪 Running Core Agent System Manual Tests\n')
  console.log('='.repeat(50))

  const results = await Promise.all([
    testLaneQueue(),
    testInMemoryAgentMemory(),
    testBuildSystemPrompt(),
    testAgentRunnerRun(),
    testLaneQueueSerialization(),
  ])

  const passed = results.filter(Boolean).length
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

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })
}
