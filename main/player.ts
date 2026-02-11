import { RpgPlayer, type RpgPlayerHooks, Control, Components, type RpgMap } from '@rpgjs/server'
import TestNpcEvent from './events/test-npc'
import GuardEvent from './events/guard'
import ArtistEvent from './events/artist'
import PhotographerEvent from './events/photographer'
import VendorEvent from './events/vendor'
import MissionaryEvent from './events/missionary'
import CatDadEvent from './events/cat-dad'
import PerceptionTestNpcEvent from './events/perception-test-npc'
import SkillTestNpcEvent from './events/skill-test-npc'
import AgentRunnerTestNpcEvent from './events/agent-runner-test-npc'
import { testLLMCall } from '../src/agents/core/llm-test'

/**
 * Tracks which maps have already had the test NPC spawned on them.
 * This prevents duplicate NPC spawns when multiple players join the same map.
 *
 * NOTE: This is a module-level variable, not global mutable state in the
 * scaling sense — it lives within the RPGJS server process and tracks
 * per-map initialization. It will be replaced by the AgentManager in the
 * future.
 */
const npcSpawnedOnMap: Set<string> = new Set()

/**
 * Toggle which NPCs spawn on the map. Set to false to disable and reduce clutter.
 */
const NPC_SPAWN_CONFIG = {
    TestNPC: true,
    Guard: true,
    Artist: false,
    Photographer: false,
    Vendor: false,
    Missionary: false,
    CatDad: false,
    PerceptionTestNPC: false,
    SkillTestNPC: false,
    AgentRunnerTestNPC: true,
} as const

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))

        // TASK-005: LLM feasibility test — fire-and-forget async call.
        // This runs in the background so it doesn't block player connection.
        // The result (or error) is logged to the server console.
        void testLLMCall()
            .then((result) => {
                console.log('[LLM-Test] ✅ Success!')
                console.log(`[LLM-Test]   Response: "${result.response}"`)
                console.log(`[LLM-Test]   Model:    ${result.model}`)
                console.log(`[LLM-Test]   Latency:  ${result.latencyMs}ms`)
            })
            .catch((err: unknown) => {
                // Graceful error handling — never crash the game server
                const message = err instanceof Error ? err.message : String(err)
                console.error('[LLM-Test] ❌ Failed:', message)
            })
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }
    },
    async onJoinMap(player: RpgPlayer) {
        // Spawn NPCs on the starting map if they haven't been spawned yet.
        // We use map.createDynamicEvent() which creates Shared-mode events,
        // so all players on the map will see the same NPCs.
        const map = player.getCurrentMap<RpgMap>()
        if (map && map.id === 'simplemap' && !npcSpawnedOnMap.has(map.id)) {
            try {
                if (NPC_SPAWN_CONFIG.TestNPC) {
                    map.createDynamicEvent({ x: 200, y: 200, event: TestNpcEvent })
                    console.log('[TestNPC] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.Guard) {
                    map.createDynamicEvent({ x: 400, y: 300, event: GuardEvent })
                    console.log('[Guard] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.Artist) {
                    map.createDynamicEvent({ x: 150, y: 400, event: ArtistEvent })
                    console.log('[Artist] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.Photographer) {
                    map.createDynamicEvent({ x: 500, y: 200, event: PhotographerEvent })
                    console.log('[Photographer] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.Vendor) {
                    map.createDynamicEvent({ x: 300, y: 500, event: VendorEvent })
                    console.log('[Vendor] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.Missionary) {
                    map.createDynamicEvent({ x: 600, y: 400, event: MissionaryEvent })
                    console.log('[Missionary] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.CatDad) {
                    map.createDynamicEvent({ x: 100, y: 300, event: CatDadEvent })
                    console.log('[CatDad] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.PerceptionTestNPC) {
                    map.createDynamicEvent({ x: 350, y: 350, event: PerceptionTestNpcEvent })
                    console.log('[PerceptionTestNPC] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.SkillTestNPC) {
                    map.createDynamicEvent({ x: 250, y: 300, event: SkillTestNpcEvent })
                    console.log('[SkillTestNPC] Spawned on map:', map.id)
                }
                if (NPC_SPAWN_CONFIG.AgentRunnerTestNPC) {
                    map.createDynamicEvent({ x: 450, y: 350, event: AgentRunnerTestNpcEvent })
                    console.log('[AgentRunnerTestNPC] Spawned on map:', map.id)
                }

                npcSpawnedOnMap.add(map.id)
            } catch (err) {
                console.error('[NPC Spawn] Failed to spawn:', err)
            }
        }

        // Show intro text to new players
        if (player.getVariable('AFTER_INTRO')) {
            return
        }
        await player.showText('Welcome! Walk around to find the NPCs.')
        await player.showText('Press the action key (Space or Enter) when facing an NPC to talk.')
        player.setVariable('AFTER_INTRO', true)
    }
}

export default player