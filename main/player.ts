import { RpgPlayer, type RpgPlayerHooks, Control, Components, type RpgMap, type RpgEvent } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'
import TestNpcEvent from './events/test-npc'
import GuardEvent from './events/guard'
import ArtistEvent from './events/artist'
import PhotographerEvent from './events/photographer'
import VendorEvent from './events/vendor'
import MissionaryEvent from './events/missionary'
import CatDadEvent from './events/cat-dad'
import PerceptionTestNpcEvent from './events/perception-test-npc'
import SkillTestNpcEvent from './events/skill-test-npc'
import AgentNpcEvent from './events/AgentNpcEvent'
import { agentManager, setAgentNpcEventClass } from '../src/agents/core'
import { testLLMCall } from '../src/agents/core/llm-test'
import { createPlayerStateManager } from '../src/persistence'
import { getSupabaseClient } from '../src/config/supabase'

// ---------------------------------------------------------------------------
// Builder Dashboard — Scripted NPC Registry
// Maps string IDs to event classes so the builder can spawn them dynamically.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCRIPTED_EVENT_REGISTRY: Record<string, new (...args: any[]) => RpgEvent> = {
    'test-npc': TestNpcEvent,
    'guard': GuardEvent,
    'artist': ArtistEvent,
    'photographer': PhotographerEvent,
    'vendor': VendorEvent,
    'missionary': MissionaryEvent,
    'cat-dad': CatDadEvent,
}

/**
 * Build the list of available scripted events for the builder dashboard.
 * Each entry has an id (the registry key) and a human-readable name.
 */
function getScriptedEventOptions(): Array<{ id: string; name: string }> {
    return Object.keys(SCRIPTED_EVENT_REGISTRY).map((id) => ({
        id,
        // Convert kebab-case to Title Case for display
        name: id
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
    }))
}

// Wire the generic AI NPC event class so AgentManager can spawn YAML-driven agents
setAgentNpcEventClass(AgentNpcEvent)

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

// ---------------------------------------------------------------------------
// TASK-013: Player State Persistence
// Create a PlayerStateManager once at module load. If Supabase is not
// configured, the manager no-ops (load returns null, save skips silently).
// ---------------------------------------------------------------------------
const playerStateManager = createPlayerStateManager()

/**
 * Toggle which scripted NPCs spawn on the map. Set all to false to see only AI NPCs loaded from DB (game.agent_configs).
 */
const NPC_SPAWN_CONFIG = {
    TestNPC: false,
    Guard: false,
    Artist: false,
    Photographer: false,
    Vendor: false,
    Missionary: false,
    CatDad: false,
    PerceptionTestNPC: false,
    SkillTestNPC: false,
    // AI NPCs from Supabase (game.agent_configs) or YAML spawn via agentManager.spawnAgentsOnMap() above
} as const

/** In-character error messages for photo-request flow (matches generate_image skill). */
function photoErrorMessage(errorCode: string): string {
    switch (errorCode) {
        case 'content_policy':
            return "I can't develop that image; my lens refuses."
        case 'no_result':
            return "The exposure came out blank... the light was wrong."
        case 'api_unavailable':
            return 'My darkroom chemicals have gone dry. Try again later.'
        case 'api_error':
            return 'Something went wrong in the darkroom. The film was ruined.'
        default:
            return "The photograph did not turn out. Perhaps another time."
    }
}

const player: RpgPlayerHooks = {
    async onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))

        // Photo-request GUI: when player submits from photographer form, run edge function and show result
        player.gui('photo-request').on('submit', async (data: { prompt: string; style?: string; eventId: string; agentId: string }) => {
            try {
                const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : ''
                if (!prompt) {
                    await player.showText("I need to know what to photograph. Describe the scene!")
                    return
                }
                const style = (data.style && String(data.style).trim()) || 'vivid'
                const map = player.getCurrentMap<RpgMap>()
                if (!map) {
                    await player.showText("The lens is clouded today... I cannot focus.")
                    return
                }
                const npcEvent = map.getEvent<RpgEvent>(data.eventId)
                if (npcEvent) {
                    try {
                        (npcEvent as any).showEmotionBubble?.(EmotionBubble.ThreeDot)
                    } catch {
                        // ignore
                    }
                }
                const supabase = getSupabaseClient()
                if (!supabase) {
                    await player.showText("The lens is clouded today... I cannot focus.")
                    return
                }
                const timeoutMs = 10_000
                const invokePromise = supabase.functions.invoke('generate-image', {
                    body: { prompt, style, agentId: data.agentId },
                })
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), timeoutMs)
                )
                let response: { data: unknown; error: unknown }
                try {
                    response = await Promise.race([invokePromise, timeoutPromise])
                } catch (raceErr: unknown) {
                    if (raceErr instanceof Error && raceErr.message === 'timeout') {
                        await player.showText("The exposure took too long... the film was overexposed.")
                        return
                    }
                    throw raceErr
                }
                const edgeData = response.data as { success?: boolean; imageDataUrl?: string; imageUrl?: string; error?: string } | null
                if (response.error) {
                    console.warn('[PhotoRequest] Edge invoke error:', response.error)
                    await player.showText('The darkroom is having troubles. I could not develop the image.')
                    return
                }
                if (edgeData?.success === true && (edgeData.imageDataUrl || edgeData.imageUrl)) {
                    const photoUrl = edgeData.imageDataUrl || edgeData.imageUrl!
                    const existing: Array<{ url: string; prompt: string; generatedBy: string; timestamp: number }> = player.getVariable('PHOTOS') || []
                    const updated = [...existing, { url: photoUrl, prompt, generatedBy: data.agentId, timestamp: Date.now() }]
                    player.setVariable('PHOTOS', updated)
                    try {
                        player.gui('photo-result').open({ imageDataUrl: photoUrl, prompt }, { blockPlayerInput: true })
                    } catch (e) {
                        console.warn('[PhotoRequest] Could not open photo-result:', e)
                    }
                } else {
                    const errCode = edgeData?.error ?? 'unknown'
                    await player.showText(photoErrorMessage(errCode))
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[PhotoRequest] Handler error:', msg)
                await player.showText("Something went wrong with the camera. The photograph was lost.")
            }
        })

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

        // -----------------------------------------------------------------
        // TASK-013: Restore player state from Supabase (if available)
        // Load saved position/map. If found, changeMap to saved location.
        // If not found or Supabase is unavailable, player starts at default.
        // -----------------------------------------------------------------
        try {
            const savedState = await playerStateManager.loadPlayer(player.id)
            if (savedState && savedState.mapId) {
                // Restore name if saved
                if (savedState.name) {
                    player.name = savedState.name
                    player.setComponentsTop(Components.text('{name}'))
                }

                // Move player to saved map and position
                try {
                    await player.changeMap(savedState.mapId, {
                        x: savedState.positionX,
                        y: savedState.positionY,
                    })
                    console.log(
                        `[PlayerState] Restored "${player.id}" to ` +
                            `map=${savedState.mapId} (${savedState.positionX}, ${savedState.positionY})`
                    )
                } catch (mapErr) {
                    // Map might not exist anymore — log and let default spawn happen
                    const msg = mapErr instanceof Error ? mapErr.message : String(mapErr)
                    console.warn(
                        `[PlayerState] Failed to restore map "${savedState.mapId}" ` +
                            `for "${player.id}": ${msg} — using default spawn`
                    )
                }
            }
        } catch (err) {
            // Never let state restore crash the connection
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[PlayerState] Restore error for "${player.id}":`, msg)
        }
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }

        // Builder Dashboard — open when player presses 'B'
        // The 'builder-dashboard' input is registered in rpg.toml
        if (input === 'builder-dashboard') {
            try {
                const map = player.getCurrentMap<RpgMap>()
                if (!map) return

                const gui = player.gui('builder-dashboard')

                // Listen for "place" interactions from the client GUI
                gui.on('place', async (data: {
                    mapId: string
                    x: number
                    y: number
                    type: 'ai-npc' | 'scripted'
                    id: string
                }) => {
                    try {
                        const currentMap = player.getCurrentMap<RpgMap>()
                        if (!currentMap || currentMap.id !== data.mapId) {
                            console.warn('[Builder] Map mismatch — player moved away')
                            return
                        }

                        if (data.type === 'ai-npc') {
                            // Spawn an AI NPC via AgentManager
                            const ok = await agentManager.spawnAgentAt(
                                data.id,
                                currentMap,
                                data.x,
                                data.y,
                            )
                            if (ok) {
                                console.log(`[Builder] Placed AI NPC "${data.id}" at (${data.x}, ${data.y})`)
                                await player.showText(`Placed AI NPC "${data.id}" at (${data.x}, ${data.y})`)
                            } else {
                                console.warn(`[Builder] Failed to spawn AI NPC "${data.id}"`)
                                await player.showText(`Failed to place "${data.id}" — config not found.`)
                            }
                        } else if (data.type === 'scripted') {
                            // Spawn a scripted NPC from the registry
                            const EventClass = SCRIPTED_EVENT_REGISTRY[data.id]
                            if (EventClass) {
                                currentMap.createDynamicEvent({
                                    x: data.x,
                                    y: data.y,
                                    event: EventClass,
                                })
                                console.log(`[Builder] Placed scripted NPC "${data.id}" at (${data.x}, ${data.y})`)
                                await player.showText(`Placed "${data.id}" at (${data.x}, ${data.y})`)
                            } else {
                                console.warn(`[Builder] Unknown scripted event id "${data.id}"`)
                                await player.showText(`Unknown scripted NPC "${data.id}"`)
                            }
                        }
                    } catch (err) {
                        console.error('[Builder] Error placing entity:', err)
                    }
                })

                // Gather the list of AI NPC configs from AgentManager
                const aiNpcConfigs = Array.from(agentManager.getAllAgents()).map(
                    (a) => a.config.id,
                )

                // Open the GUI, passing available options as props
                gui.open(
                    {
                        mapId: map.id,
                        aiNpcConfigs,
                        scriptedEvents: getScriptedEventOptions(),
                    },
                    { blockPlayerInput: true },
                )
            } catch (err) {
                console.error('[Builder] Error opening dashboard:', err)
            }
        }

        if (input === 'conversation-log') {
            try {
                const conversations = agentManager.getConversationsForPlayer(player.id)
                const gui = player.gui('conversation-log')
                gui.open({ conversations }, { blockPlayerInput: false })
            } catch (err) {
                console.error('[ConversationLog] Error opening:', err)
            }
        }
    },
    async onJoinMap(player: RpgPlayer) {
        // Spawn NPCs on the starting map if they haven't been spawned yet.
        // We use map.createDynamicEvent() which creates Shared-mode events,
        // so all players on the map will see the same NPCs.
        const map = player.getCurrentMap<RpgMap>()
        if (map && !npcSpawnedOnMap.has(map.id)) {
            try {
                // Spawn AI NPCs (Supabase or YAML) for this map
                await agentManager.spawnAgentsOnMap(map)

                // Scripted NPCs (hardcoded positions) only on simplemap
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.TestNPC) {
                    map.createDynamicEvent({ x: 200, y: 200, event: TestNpcEvent })
                    console.log('[TestNPC] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.Guard) {
                    map.createDynamicEvent({ x: 400, y: 300, event: GuardEvent })
                    console.log('[Guard] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.Artist) {
                    map.createDynamicEvent({ x: 150, y: 400, event: ArtistEvent })
                    console.log('[Artist] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.Photographer) {
                    map.createDynamicEvent({ x: 500, y: 200, event: PhotographerEvent })
                    console.log('[Photographer] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.Vendor) {
                    map.createDynamicEvent({ x: 300, y: 500, event: VendorEvent })
                    console.log('[Vendor] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.Missionary) {
                    map.createDynamicEvent({ x: 600, y: 400, event: MissionaryEvent })
                    console.log('[Missionary] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.CatDad) {
                    map.createDynamicEvent({ x: 100, y: 300, event: CatDadEvent })
                    console.log('[CatDad] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.PerceptionTestNPC) {
                    map.createDynamicEvent({ x: 350, y: 350, event: PerceptionTestNpcEvent })
                    console.log('[PerceptionTestNPC] Spawned on map:', map.id)
                }
                if (map.id === 'simplemap' && NPC_SPAWN_CONFIG.SkillTestNPC) {
                    map.createDynamicEvent({ x: 250, y: 300, event: SkillTestNpcEvent })
                    console.log('[SkillTestNPC] Spawned on map:', map.id)
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
    },

    // -----------------------------------------------------------------
    // NPC Reload: clear spawn state when last player leaves so NPCs respawn on return/refresh
    // -----------------------------------------------------------------
    onLeaveMap(player: RpgPlayer, map: RpgMap) {
        if (map && (map as RpgMap & { nbPlayers?: number }).nbPlayers <= 1) {
            console.log(`[NPC Reload] Last player left ${map.id} — clearing spawn state`)
            npcSpawnedOnMap.delete(map.id)
            agentManager.clearMapSpawnState(map.id)
        }
    },

    // -----------------------------------------------------------------
    // TASK-013: Save player state on disconnect
    // Fire-and-forget — we don't await so disconnect isn't blocked.
    // If Supabase is unavailable the manager no-ops silently.
    // -----------------------------------------------------------------
    onDisconnected(player: RpgPlayer) {
        try {
            const map = player.getCurrentMap<RpgMap>()
            const mapId = map?.id ?? 'simplemap'

            if (map && (map as RpgMap & { nbPlayers?: number }).nbPlayers <= 1) {
                console.log(`[NPC Reload] Last player disconnecting from ${map.id} — clearing spawn state`)
                npcSpawnedOnMap.delete(mapId)
                agentManager.clearMapSpawnState(mapId)
            }

            playerStateManager
                .savePlayer({
                    playerId: player.id,
                    name: player.name ?? 'Player',
                    mapId,
                    positionX: player.position.x,
                    positionY: player.position.y,
                    direction: (player as unknown as { direction?: number }).direction ?? 0,
                    stateData: {},
                })
                .catch((err: unknown) => {
                    const msg = err instanceof Error ? err.message : String(err)
                    console.error(`[PlayerState] Save on disconnect failed for "${player.id}":`, msg)
                })
        } catch (err) {
            // Never let save logic crash the disconnect flow
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[PlayerState] Disconnect handler error for "${player.id}":`, msg)
        }
    },
}

export default player