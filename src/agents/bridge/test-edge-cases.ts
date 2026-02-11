/**
 * Edge Case Tests for Bridge Layer (GameChannelAdapter, Bridge)
 *
 * Run with: npx tsx src/agents/bridge/test-edge-cases.ts
 *
 * Tests error handling, disposal safety, double-registration,
 * runner failures, and concurrent enqueue behavior.
 */

import { Bridge } from './Bridge'
import { GameChannelAdapter } from './GameChannelAdapter'
import { LaneQueue } from '../core/LaneQueue'
import type {
  AgentEvent,
  AgentRunResult,
  IAgentRunner,
  AgentConfig,
} from '../core/types'
import type {
  GameEvent,
  GamePlayer,
} from './types'
import type { PerceptionSnapshot } from '../perception/types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0
let total = 0

function assert(condition: boolean, label: string): void {
  total++
  if (condition) {
    passed++
    console.log(`  ✅ ${label}`)
  } else {
    console.log(`  ❌ ${label}`)
  }
}

function createMockEvent(id: string): GameEvent {
  return {
    id,
    position: { x: 0, y: 0 },
    moveRoutes: async () => true,
  } as unknown as GameEvent
}

function createMockPlayer(id: string, name: string): GamePlayer {
  return {
    id,
    name,
    position: { x: 50, y: 50 },
  } as unknown as GamePlayer
}

function createMockRunner(log: AgentEvent[]): IAgentRunner {
  return {
    config: {
      id: 'test-agent',
      name: 'Test NPC',
      graphic: 'female',
      personality: 'Test.',
      model: { idle: 'mock', conversation: 'mock' },
      skills: [],
      spawn: { map: 'simplemap', x: 0, y: 0 },
      behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
    } as AgentConfig,
    async run(event: AgentEvent): Promise<AgentRunResult> {
      log.push(event)
      return { success: true, text: 'ok', skillResults: [], durationMs: 0 }
    },
    buildSystemPrompt(_p: PerceptionSnapshot): string { return '' },
    async dispose(): Promise<void> {},
  }
}

/** Create a mock runner that throws on every run() call. */
function createThrowingRunner(): IAgentRunner {
  return {
    config: {
      id: 'error-agent',
      name: 'Error NPC',
      graphic: 'female',
      personality: 'Test.',
      model: { idle: 'mock', conversation: 'mock' },
      skills: [],
      spawn: { map: 'simplemap', x: 0, y: 0 },
      behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
    } as AgentConfig,
    async run(_event: AgentEvent): Promise<AgentRunResult> {
      throw new Error('LLM exploded')
    },
    buildSystemPrompt(_p: PerceptionSnapshot): string { return '' },
    async dispose(): Promise<void> {},
  }
}

// ---------------------------------------------------------------------------
// Edge Test 1: Adapter ignores events after dispose
// ---------------------------------------------------------------------------

async function testAdapterAfterDispose() {
  console.log('\n=== Edge Test 1: Adapter ignores events after dispose ===')

  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()
  const event = createMockEvent('npc-1')
  const player = createMockPlayer('p1', 'Hero')

  const adapter = new GameChannelAdapter({
    agentId: 'test',
    laneQueue,
    runner,
    idleIntervalMs: 999999,
    logPrefix: '[Disposed]',
  })

  // Dispose first, then try to trigger events
  adapter.dispose()

  adapter.onPlayerAction(player, event)
  adapter.onPlayerProximity(player, event)
  adapter.onPlayerLeave(player, event)
  adapter.onIdleTick(event)

  await new Promise((r) => setTimeout(r, 100))

  assert(log.length === 0, `No events processed after dispose (got ${log.length})`)
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 2: Runner throws — adapter catches and logs, queue continues
// ---------------------------------------------------------------------------

async function testRunnerThrows() {
  console.log('\n=== Edge Test 2: Runner throws — adapter catches gracefully ===')

  const runner = createThrowingRunner()
  const laneQueue = new LaneQueue()
  const event = createMockEvent('npc-err')
  const player = createMockPlayer('p1', 'Hero')

  const adapter = new GameChannelAdapter({
    agentId: 'error-agent',
    laneQueue,
    runner,
    idleIntervalMs: 999999,
    logPrefix: '[Err]',
  })

  // Should not throw — error is caught inside enqueueRun
  adapter.onPlayerAction(player, event)
  await new Promise((r) => setTimeout(r, 100))

  // Queue should still work after the error
  const log: AgentEvent[] = []
  const goodRunner = createMockRunner(log)
  const adapter2 = new GameChannelAdapter({
    agentId: 'error-agent', // Same agent ID — same lane
    laneQueue,
    runner: goodRunner,
    idleIntervalMs: 999999,
    logPrefix: '[Good]',
  })

  adapter2.onIdleTick(event)
  await new Promise((r) => setTimeout(r, 100))

  assert(log.length === 1, `Queue still works after error (got ${log.length})`)

  adapter.dispose()
  adapter2.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 3: Bridge double-registration overwrites old adapter
// ---------------------------------------------------------------------------

async function testBridgeDoubleRegister() {
  console.log('\n=== Edge Test 3: Bridge double-registration overwrites old ===')

  const bridge = new Bridge()
  const event = createMockEvent('npc-dup')
  const player = createMockPlayer('p1', 'Hero')
  const laneQueue = new LaneQueue()

  const log1: AgentEvent[] = []
  const log2: AgentEvent[] = []
  const runner1 = createMockRunner(log1)
  const runner2 = createMockRunner(log2)

  const adapter1 = new GameChannelAdapter({
    agentId: 'agent-old',
    laneQueue,
    runner: runner1,
    idleIntervalMs: 999999,
    logPrefix: '[Old]',
  })
  const adapter2 = new GameChannelAdapter({
    agentId: 'agent-new',
    laneQueue,
    runner: runner2,
    idleIntervalMs: 999999,
    logPrefix: '[New]',
  })

  // Register first adapter
  bridge.registerAgent(event, 'agent-old', adapter1)
  assert(bridge.getAgentId(event) === 'agent-old', `First registration: agent-old`)

  // Re-register same event with new adapter
  bridge.registerAgent(event, 'agent-new', adapter2)
  assert(bridge.getAgentId(event) === 'agent-new', `After re-register: agent-new`)

  // Action should go to the new adapter
  bridge.handlePlayerAction(player, event)
  await new Promise((r) => setTimeout(r, 100))

  assert(log1.length === 0, `Old adapter received 0 events`)
  assert(log2.length === 1, `New adapter received 1 event`)

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 4: Bridge handlePlayerAction on unregistered event
// ---------------------------------------------------------------------------

async function testBridgeUnregisteredEvent() {
  console.log('\n=== Edge Test 4: Bridge handle on unregistered event ===')

  const bridge = new Bridge()
  const event = createMockEvent('ghost-npc')
  const player = createMockPlayer('p1', 'Hero')

  // Should log a warning but not throw
  bridge.handlePlayerAction(player, event)
  bridge.handlePlayerProximity(player, event)
  bridge.handlePlayerLeave(player, event)

  assert(bridge.getAgentId(event) === undefined, `No agent for unregistered event`)

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 5: Bridge dispose is safe to call multiple times
// ---------------------------------------------------------------------------

async function testBridgeDisposeSafe() {
  console.log('\n=== Edge Test 5: Bridge dispose is safe to call multiple times ===')

  const bridge = new Bridge()
  const event = createMockEvent('npc-safe')
  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()

  const adapter = new GameChannelAdapter({
    agentId: 'safe-agent',
    laneQueue,
    runner,
    idleIntervalMs: 999999,
    logPrefix: '[Safe]',
  })

  bridge.registerAgent(event, 'safe-agent', adapter)

  // Dispose twice — should not throw
  bridge.dispose()
  bridge.dispose()

  assert(true, `Double dispose did not throw`)
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 6: Adapter start() after dispose is no-op
// ---------------------------------------------------------------------------

async function testAdapterStartAfterDispose() {
  console.log('\n=== Edge Test 6: Adapter start() after dispose is no-op ===')

  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()
  const event = createMockEvent('npc-start')

  const adapter = new GameChannelAdapter({
    agentId: 'start-test',
    laneQueue,
    runner,
    idleIntervalMs: 50,
    logPrefix: '[StartTest]',
  })

  adapter.dispose()
  adapter.start(event) // Should be ignored since disposed

  await new Promise((r) => setTimeout(r, 200))

  assert(log.length === 0, `No ticks fired after dispose + start (got ${log.length})`)
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 7: Multiple agents on same LaneQueue serialize correctly
// ---------------------------------------------------------------------------

async function testMultipleAgentsSerialization() {
  console.log('\n=== Edge Test 7: Multiple agents serialize on shared LaneQueue ===')

  const laneQueue = new LaneQueue()
  const order: string[] = []

  // Create two "slow" runners that record execution order
  const runner1: IAgentRunner = {
    ...createMockRunner([]),
    async run(event: AgentEvent): Promise<AgentRunResult> {
      order.push(`A-${event.type}`)
      // Simulate some work
      await new Promise((r) => setTimeout(r, 30))
      return { success: true, text: 'A done', skillResults: [], durationMs: 30 }
    },
  }
  const runner2: IAgentRunner = {
    ...createMockRunner([]),
    async run(event: AgentEvent): Promise<AgentRunResult> {
      order.push(`B-${event.type}`)
      await new Promise((r) => setTimeout(r, 30))
      return { success: true, text: 'B done', skillResults: [], durationMs: 30 }
    },
  }

  const event1 = createMockEvent('npc-A')
  const event2 = createMockEvent('npc-B')
  const player = createMockPlayer('p1', 'Hero')

  const adapter1 = new GameChannelAdapter({
    agentId: 'agent-A',
    laneQueue,
    runner: runner1,
    idleIntervalMs: 999999,
    logPrefix: '[A]',
  })
  const adapter2 = new GameChannelAdapter({
    agentId: 'agent-B',
    laneQueue,
    runner: runner2,
    idleIntervalMs: 999999,
    logPrefix: '[B]',
  })

  // Fire actions on both agents — they have different agentIds so they
  // should run in parallel (LaneQueue serializes per-agent, not globally)
  adapter1.onPlayerAction(player, event1)
  adapter2.onPlayerAction(player, event2)

  // Wait for both to complete
  await new Promise((r) => setTimeout(r, 200))

  assert(order.length === 2, `Both agents processed (got ${order.length})`)
  assert(order.includes('A-player_action'), `Agent A processed player_action`)
  assert(order.includes('B-player_action'), `Agent B processed player_action`)

  adapter1.dispose()
  adapter2.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Edge Test 8: Bridge registerAgent without adapter (ID-only)
// ---------------------------------------------------------------------------

async function testBridgeRegisterWithoutAdapter() {
  console.log('\n=== Edge Test 8: Bridge registerAgent without adapter ===')

  const bridge = new Bridge()
  const event = createMockEvent('npc-no-adapter')

  // Register with just agentId, no adapter
  bridge.registerAgent(event, 'lonely-agent')

  assert(bridge.getAgentId(event) === 'lonely-agent', `Agent ID registered`)

  // handlePlayerAction should not throw (no-op adapter)
  const player = createMockPlayer('p1', 'Hero')
  bridge.handlePlayerAction(player, event)

  assert(true, `handlePlayerAction on no-op adapter did not throw`)

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Run all edge-case tests
// ---------------------------------------------------------------------------

async function runAllEdgeCaseTests() {
  console.log('🔬 Running Bridge Layer Edge Case Tests\n')
  console.log('='.repeat(60))

  await testAdapterAfterDispose()
  await testRunnerThrows()
  await testBridgeDoubleRegister()
  await testBridgeUnregisteredEvent()
  await testBridgeDisposeSafe()
  await testAdapterStartAfterDispose()
  await testMultipleAgentsSerialization()
  await testBridgeRegisterWithoutAdapter()

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Edge Test Results: ${passed}/${total} assertions passed`)
  if (passed === total) {
    console.log('✅ All edge case tests passed!')
  } else {
    console.log(`❌ ${total - passed} assertion(s) failed`)
    process.exit(1)
  }
}

runAllEdgeCaseTests().catch((err) => {
  console.error('Fatal error running tests:', err)
  process.exit(1)
})
