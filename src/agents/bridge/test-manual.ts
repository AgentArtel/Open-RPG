/**
 * Manual Test Script for Bridge Layer (GameChannelAdapter, Bridge)
 *
 * Run with: npx tsx src/agents/bridge/test-manual.ts
 *
 * Tests the bridge's routing and the adapter's event normalization + enqueue
 * behavior using mocks. No real API calls or RPGJS server needed.
 */

import { Bridge } from './Bridge'
import { GameChannelAdapter } from './GameChannelAdapter'
import { LaneQueue } from '../core/LaneQueue'
import type {
  AgentEvent,
  AgentRunResult,
  IAgentRunner,
  AgentConfig,
  ILaneQueue,
} from '../core/types'
import type {
  GameEvent,
  GamePlayer,
  IGameChannelAdapter,
} from './types'
import type { PerceptionSnapshot } from '../perception/types'

// ---------------------------------------------------------------------------
// Test helpers and result tracking
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

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Create a mock GameEvent (simulates an RpgEvent with an id and position). */
function createMockEvent(id: string): GameEvent {
  return {
    id,
    position: { x: 100, y: 200 },
    moveRoutes: async () => true,
  } as unknown as GameEvent
}

/** Create a mock GamePlayer (simulates an RpgPlayer). */
function createMockPlayer(id: string, name: string): GamePlayer {
  return {
    id,
    name,
    position: { x: 50, y: 75 },
  } as unknown as GamePlayer
}

/**
 * Create a mock AgentRunner that records every event it receives.
 * Returns a fixed response.
 */
function createMockRunner(log: AgentEvent[]): IAgentRunner {
  return {
    config: {
      id: 'test-agent',
      name: 'Test NPC',
      graphic: 'female',
      personality: 'Test personality.',
      model: { idle: 'mock', conversation: 'mock' },
      skills: [],
      spawn: { map: 'simplemap', x: 0, y: 0 },
      behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
    } as AgentConfig,

    async run(event: AgentEvent): Promise<AgentRunResult> {
      // Record the event for assertions
      log.push(event)
      return {
        success: true,
        text: `Processed ${event.type}`,
        skillResults: [],
        durationMs: 1,
      }
    },

    buildSystemPrompt(_perception: PerceptionSnapshot): string {
      return 'mock system prompt'
    },

    async dispose(): Promise<void> {},
  }
}

// ---------------------------------------------------------------------------
// Test 1: GameChannelAdapter builds correct AgentEvents
// ---------------------------------------------------------------------------

async function testAdapterEventBuilding() {
  console.log('\n=== Test 1: GameChannelAdapter builds correct AgentEvents ===')

  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()
  const event = createMockEvent('npc-1')
  const player = createMockPlayer('player-1', 'Hero')

  const adapter = new GameChannelAdapter({
    agentId: 'test-agent',
    laneQueue,
    runner,
    idleIntervalMs: 60000, // Long interval so it doesn't auto-fire during test
    logPrefix: '[Test]',
  })

  // Call each method and wait for the lane queue to drain
  adapter.onPlayerAction(player, event)
  // Small delay so the lane queue processes
  await new Promise((r) => setTimeout(r, 50))

  assert(log.length === 1, `onPlayerAction enqueued 1 event (got ${log.length})`)
  assert(log[0].type === 'player_action', `Event type is player_action`)
  assert(log[0].player !== undefined, `Event has player snapshot`)
  assert(log[0].player!.id === 'player-1', `Player id is correct`)
  assert(log[0].player!.name === 'Hero', `Player name is correct`)
  assert(log[0].timestamp > 0, `Timestamp is set`)

  adapter.onPlayerProximity(player, event)
  await new Promise((r) => setTimeout(r, 50))

  assert(log.length === 2, `onPlayerProximity enqueued 2nd event`)
  assert(log[1].type === 'player_proximity', `Event type is player_proximity`)

  adapter.onPlayerLeave(player, event)
  await new Promise((r) => setTimeout(r, 50))

  assert(log.length === 3, `onPlayerLeave enqueued 3rd event`)
  assert(log[2].type === 'player_leave', `Event type is player_leave`)

  adapter.onIdleTick(event)
  await new Promise((r) => setTimeout(r, 50))

  assert(log.length === 4, `onIdleTick enqueued 4th event`)
  assert(log[3].type === 'idle_tick', `Event type is idle_tick`)
  assert(log[3].player === undefined, `idle_tick has no player`)

  // Cleanup
  adapter.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Test 2: GameChannelAdapter dispose stops idle timer
// ---------------------------------------------------------------------------

async function testAdapterDispose() {
  console.log('\n=== Test 2: GameChannelAdapter dispose stops idle timer ===')

  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()
  const event = createMockEvent('npc-2')

  const adapter = new GameChannelAdapter({
    agentId: 'test-agent-2',
    laneQueue,
    runner,
    idleIntervalMs: 50, // Very short interval
    logPrefix: '[Test2]',
  })

  // Start the timer
  adapter.start(event)

  // Wait for at least one tick to fire
  await new Promise((r) => setTimeout(r, 100))
  const countBeforeDispose = log.length
  assert(countBeforeDispose >= 1, `At least 1 idle tick fired before dispose (got ${countBeforeDispose})`)

  // Dispose and wait to confirm no more ticks
  adapter.dispose()
  await new Promise((r) => setTimeout(r, 200))

  assert(
    log.length === countBeforeDispose,
    `No more ticks after dispose (before: ${countBeforeDispose}, after: ${log.length})`
  )

  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Test 3: Bridge registerAgent and getAgentId
// ---------------------------------------------------------------------------

async function testBridgeRegistration() {
  console.log('\n=== Test 3: Bridge registerAgent and getAgentId ===')

  const bridge = new Bridge()
  const event1 = createMockEvent('npc-A')
  const event2 = createMockEvent('npc-B')

  const log1: AgentEvent[] = []
  const log2: AgentEvent[] = []
  const runner1 = createMockRunner(log1)
  const runner2 = createMockRunner(log2)
  const laneQueue = new LaneQueue()

  // Create adapters (no auto-start; we'll test routing only)
  const adapter1 = new GameChannelAdapter({
    agentId: 'elder-theron',
    laneQueue,
    runner: runner1,
    idleIntervalMs: 999999,
    logPrefix: '[Elder]',
  })
  const adapter2 = new GameChannelAdapter({
    agentId: 'guard-npc',
    laneQueue,
    runner: runner2,
    idleIntervalMs: 999999,
    logPrefix: '[Guard]',
  })

  // Register both
  bridge.registerAgent(event1, 'elder-theron', adapter1)
  bridge.registerAgent(event2, 'guard-npc', adapter2)

  assert(bridge.getAgentId(event1) === 'elder-theron', `getAgentId(event1) = elder-theron`)
  assert(bridge.getAgentId(event2) === 'guard-npc', `getAgentId(event2) = guard-npc`)

  // Unknown event
  const unknown = createMockEvent('npc-X')
  assert(bridge.getAgentId(unknown) === undefined, `getAgentId(unknown) = undefined`)

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Test 4: Bridge routes handlePlayerAction to correct adapter
// ---------------------------------------------------------------------------

async function testBridgeRouting() {
  console.log('\n=== Test 4: Bridge routes handlePlayerAction correctly ===')

  const bridge = new Bridge()
  const event1 = createMockEvent('npc-A')
  const event2 = createMockEvent('npc-B')
  const player = createMockPlayer('player-1', 'Hero')

  const log1: AgentEvent[] = []
  const log2: AgentEvent[] = []
  const runner1 = createMockRunner(log1)
  const runner2 = createMockRunner(log2)
  const laneQueue = new LaneQueue()

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

  bridge.registerAgent(event1, 'agent-A', adapter1)
  bridge.registerAgent(event2, 'agent-B', adapter2)

  // Action on event1 should only reach runner1
  bridge.handlePlayerAction(player, event1)
  await new Promise((r) => setTimeout(r, 50))

  assert(log1.length === 1, `Agent A received 1 event (got ${log1.length})`)
  assert(log2.length === 0, `Agent B received 0 events (got ${log2.length})`)
  assert(log1[0].type === 'player_action', `Agent A got player_action`)

  // Action on event2 should only reach runner2
  bridge.handlePlayerAction(player, event2)
  await new Promise((r) => setTimeout(r, 50))

  assert(log1.length === 1, `Agent A still has 1 event`)
  assert(log2.length === 1, `Agent B received 1 event (got ${log2.length})`)
  assert(log2[0].type === 'player_action', `Agent B got player_action`)

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Test 5: Bridge unregisterAgent disposes adapter
// ---------------------------------------------------------------------------

async function testBridgeUnregister() {
  console.log('\n=== Test 5: Bridge unregisterAgent disposes adapter ===')

  const bridge = new Bridge()
  const event = createMockEvent('npc-Z')
  const log: AgentEvent[] = []
  const runner = createMockRunner(log)
  const laneQueue = new LaneQueue()

  const adapter = new GameChannelAdapter({
    agentId: 'agent-Z',
    laneQueue,
    runner,
    idleIntervalMs: 50, // Short interval to test timer is cleared
    logPrefix: '[Z]',
  })

  bridge.registerAgent(event, 'agent-Z', adapter)

  // Verify registered
  assert(bridge.getAgentId(event) === 'agent-Z', `Registered OK`)

  // Wait for an idle tick
  await new Promise((r) => setTimeout(r, 120))
  const countBefore = log.length

  // Unregister — should dispose adapter and clear timer
  bridge.unregisterAgent(event)
  assert(bridge.getAgentId(event) === undefined, `After unregister: getAgentId = undefined`)

  // Wait to confirm no more ticks
  await new Promise((r) => setTimeout(r, 200))
  assert(
    log.length === countBefore,
    `No more ticks after unregister (before: ${countBefore}, after: ${log.length})`
  )

  bridge.dispose()
  console.log('  ✅ PASSED')
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

async function runAllTests() {
  console.log('🧪 Running Bridge Layer Manual Tests\n')
  console.log('='.repeat(60))

  await testAdapterEventBuilding()
  await testAdapterDispose()
  await testBridgeRegistration()
  await testBridgeRouting()
  await testBridgeUnregister()

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Results: ${passed}/${total} assertions passed`)
  if (passed === total) {
    console.log('✅ All tests passed!')
  } else {
    console.log(`❌ ${total - passed} assertion(s) failed`)
    process.exit(1)
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error running tests:', err)
  process.exit(1)
})
