/**
 * Edge Case Tests for Core Agent System
 *
 * Run with: npx tsx src/agents/core/test-edge-cases.ts
 *
 * Tests edge conditions: errors, empty state, boundaries, tool loop.
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
// Shared mocks
// ---------------------------------------------------------------------------

function createMockAgentConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    id: 'test-agent',
    name: 'Test NPC',
    graphic: 'male',
    personality: 'You are a test NPC.',
    model: { idle: 'kimi-k2', conversation: 'kimi-k2.5' },
    skills: ['wait'],
    spawn: { map: 'simplemap', x: 0, y: 0 },
    behavior: {
      idleInterval: 15000,
      patrolRadius: 3,
      greetOnProximity: true,
    },
    ...overrides,
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

// ---------------------------------------------------------------------------
// Edge Test 1: LaneQueue — unknown agentId
// ---------------------------------------------------------------------------

async function testLaneQueueUnknownAgent() {
  console.log('\n=== Edge Test 1: LaneQueue unknown agentId ===')

  const queue = new LaneQueue()
  const processing = queue.isProcessing('nonexistent')
  const length = queue.getQueueLength('nonexistent')

  console.log('  isProcessing(nonexistent):', processing)
  console.log('  getQueueLength(nonexistent):', length)

  const passed = !processing && length === 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 2: LaneQueue — task throws
// ---------------------------------------------------------------------------

async function testLaneQueueTaskThrows() {
  console.log('\n=== Edge Test 2: LaneQueue task throws ===')

  const queue = new LaneQueue()
  let secondRan = false

  await queue.enqueue('agent-1', async () => {
    throw new Error('Intentional failure')
  })
  await queue.enqueue('agent-1', async () => {
    secondRan = true
  })

  console.log('  Second task ran after first threw:', secondRan ? '✅' : '❌')

  const passed = secondRan
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 3: InMemoryAgentMemory — getRecentContext(0)
// ---------------------------------------------------------------------------

async function testMemoryZeroTokens() {
  console.log('\n=== Edge Test 3: Memory getRecentContext(0) ===')

  const memory = new InMemoryAgentMemory()
  memory.addMessage({
    role: 'user',
    content: 'Hello',
    timestamp: Date.now(),
  })

  const recent = memory.getRecentContext(0)
  console.log('  getRecentContext(0) length:', recent.length)

  const passed = recent.length === 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 4: InMemoryAgentMemory — maxMessages trim
// ---------------------------------------------------------------------------

async function testMemoryMaxMessagesTrim() {
  console.log('\n=== Edge Test 4: Memory maxMessages trim ===')

  const memory = new InMemoryAgentMemory({ maxMessages: 3 })

  for (let i = 0; i < 5; i++) {
    memory.addMessage({
      role: 'user',
      content: `msg-${i}`,
      timestamp: Date.now(),
    })
  }

  const count = memory.getMessageCount()
  const all = memory.getAllMessages()
  const firstContent = all[0]?.content

  console.log('  Message count after 5 adds:', count)
  console.log('  Oldest message:', firstContent)

  const passed = count === 3 && firstContent === 'msg-2'
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 5: InMemoryAgentMemory — save/load no-op
// ---------------------------------------------------------------------------

async function testMemorySaveLoadNoOp() {
  console.log('\n=== Edge Test 5: Memory save/load no-op ===')

  const memory = new InMemoryAgentMemory()
  memory.addMessage({
    role: 'user',
    content: 'test',
    timestamp: Date.now(),
  })

  await memory.save('test-agent')
  await memory.load('other-agent')

  const count = memory.getMessageCount()
  console.log('  Message count after save/load:', count)

  const passed = count === 1
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 6: AgentRunner — getContext throws
// ---------------------------------------------------------------------------

async function testRunnerGetContextThrows() {
  console.log('\n=== Edge Test 6: AgentRunner getContext throws ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  const mockLlm: ILLMClient = {
    async complete() {
      return {
        text: '',
        toolCalls: [],
        stopReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
      }
    },
  }
  const getContext = async (_e: AgentEvent): Promise<RunContext> => {
    throw new Error('Context unavailable')
  }

  const runner = new AgentRunner(
    config,
    perception,
    skills,
    memory,
    mockLlm,
    getContext
  )

  const result = await runner.run({
    type: 'idle_tick',
    timestamp: Date.now(),
  })

  console.log('  success:', result.success)
  console.log('  error:', result.error?.slice(0, 40))

  const passed =
    !result.success &&
    result.error != null &&
    result.error.includes('Context unavailable')
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 7: AgentRunner — LLM throws
// ---------------------------------------------------------------------------

async function testRunnerLLMThrows() {
  console.log('\n=== Edge Test 7: AgentRunner LLM throws ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  const mockLlm: ILLMClient = {
    async complete() {
      throw new Error('API rate limit')
    },
  }
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

  const result = await runner.run({
    type: 'idle_tick',
    timestamp: Date.now(),
  })

  console.log('  success:', result.success)
  console.log('  error:', result.error?.slice(0, 40))

  const passed =
    !result.success &&
    result.error != null &&
    result.text === '' &&
    result.skillResults.length === 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 8: AgentRunner — buildSystemPrompt with empty memory
// ---------------------------------------------------------------------------

async function testRunnerBuildPromptEmptyMemory() {
  console.log('\n=== Edge Test 8: buildSystemPrompt empty memory ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  const mockLlm = {
    async complete() {
      return {
        text: '',
        toolCalls: [],
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 0, outputTokens: 0 },
      }
    },
  }
  const getContext = async (_e: AgentEvent): Promise<RunContext> => ({
    perceptionContext: createMockPerceptionContext(),
    gameContext: createMockGameContext(),
  })

  const runner = new AgentRunner(
    config,
    perception,
    skills,
    memory,
    mockLlm as ILLMClient,
    getContext
  )

  const snapshot = await perception.generateSnapshot(createMockPerceptionContext())
  const prompt = runner.buildSystemPrompt(snapshot)

  const hasIdentity = prompt.includes('Identity')
  const noRecentSection = !prompt.includes('Recent context') || prompt.includes('Recent context\n\n')
  console.log('  Has Identity:', hasIdentity ? '✅' : '❌')
  console.log('  No recent context block (or empty):', noRecentSection ? '✅' : '❌')

  const passed = hasIdentity && prompt.length > 0
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 9: AgentRunner — config.skills empty (no tools sent)
// ---------------------------------------------------------------------------

async function testRunnerEmptySkillsConfig() {
  console.log('\n=== Edge Test 9: AgentRunner config.skills empty ===')

  const config = createMockAgentConfig({ skills: [] })
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  let toolsReceived: unknown = undefined
  const mockLlm: ILLMClient = {
    async complete(_messages, options) {
      toolsReceived = options.tools
      return {
        text: 'Okay.',
        toolCalls: [],
        stopReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
      }
    },
  }
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

  const result = await runner.run({
    type: 'idle_tick',
    timestamp: Date.now(),
  })

  const allowedToolsEmpty =
    Array.isArray(toolsReceived) && toolsReceived.length === 0
  console.log('  success:', result.success)
  console.log('  tools passed to LLM:', Array.isArray(toolsReceived) ? toolsReceived.length : 'N/A')

  const passed = result.success && allowedToolsEmpty
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Edge Test 10: AgentRunner — tool call (mock returns tool, then text)
// ---------------------------------------------------------------------------

async function testRunnerToolCallThenText() {
  console.log('\n=== Edge Test 10: AgentRunner tool call then text ===')

  const config = createMockAgentConfig()
  const perception = new PerceptionEngine()
  const skills = new SkillRegistry()
  skills.register(waitSkill)
  const memory = new InMemoryAgentMemory()
  let callCount = 0
  const mockLlm: ILLMClient = {
    async complete(messages, _options) {
      callCount++
      if (callCount === 1) {
        return {
          text: '',
          toolCalls: [
            {
              id: 'call-1',
              name: 'wait',
              input: { durationMs: 10 },
            },
          ],
          stopReason: 'tool_use',
          usage: { inputTokens: 0, outputTokens: 0 },
        }
      }
      return {
        text: 'I waited a moment.',
        toolCalls: [],
        stopReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
      }
    },
  }
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

  const result = await runner.run({
    type: 'idle_tick',
    timestamp: Date.now(),
  })

  console.log('  success:', result.success)
  console.log('  LLM call count:', callCount)
  console.log('  skillResults length:', result.skillResults.length)
  console.log('  final text:', result.text)

  const passed =
    result.success &&
    callCount === 2 &&
    result.skillResults.length === 1 &&
    result.skillResults[0].skillName === 'wait' &&
    result.skillResults[0].result.success &&
    result.text === 'I waited a moment.'
  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED')
  return passed
}

// ---------------------------------------------------------------------------
// Run all edge tests
// ---------------------------------------------------------------------------

async function runAllEdgeCaseTests() {
  console.log('🧪 Running Core Agent System Edge Case Tests\n')
  console.log('='.repeat(60))

  const results = await Promise.all([
    testLaneQueueUnknownAgent(),
    testLaneQueueTaskThrows(),
    testMemoryZeroTokens(),
    testMemoryMaxMessagesTrim(),
    testMemorySaveLoadNoOp(),
    testRunnerGetContextThrows(),
    testRunnerLLMThrows(),
    testRunnerBuildPromptEmptyMemory(),
    testRunnerEmptySkillsConfig(),
    testRunnerToolCallThenText(),
  ])

  const passed = results.filter(Boolean).length
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

if (require.main === module) {
  runAllEdgeCaseTests().catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })
}
