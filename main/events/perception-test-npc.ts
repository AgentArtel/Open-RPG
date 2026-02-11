/**
 * Perception Test NPC — Integration test for PerceptionEngine
 *
 * This NPC tests the PerceptionEngine in the actual game environment.
 * It logs perception snapshots to the console so we can verify it works.
 */

import { RpgEvent, EventData, RpgPlayer, RpgWorld, type RpgMap } from '@rpgjs/server'
import { PerceptionEngine } from '../../src/agents/perception/PerceptionEngine'
import type { PerceptionContext } from '../../src/agents/perception/types'
import type { Position } from '../../src/agents/bridge/types'

@EventData({
    name: 'EV-PERCEPTION-TEST',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class PerceptionTestNpcEvent extends RpgEvent {
    private perceptionEngine = new PerceptionEngine()
    private testInterval: NodeJS.Timeout | null = null

    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 200

        console.log('[PerceptionTestNPC] Initialized — will test PerceptionEngine every 5 seconds')

        // Test perception every 5 seconds
        this.testInterval = setInterval(() => {
            this.testPerception().catch(err => {
                console.error('[PerceptionTestNPC] Error testing perception:', err)
            })
        }, 5000)

        // Also test immediately
        void this.testPerception()
    }

    async onAction(player: RpgPlayer) {
        // Test perception when player interacts
        const snapshot = await this.testPerception()
        
        if (snapshot) {
            await player.showText(
                `I can see ${snapshot.entities.length} entity/entities nearby.`,
                { talkWith: this }
            )
            await player.showText(
                `Summary: ${snapshot.summary}`,
                { talkWith: this }
            )
        } else {
            await player.showText(
                'Perception test failed. Check server console for details.',
                { talkWith: this }
            )
        }
    }

    /**
     * Test the PerceptionEngine with current game state.
     */
    private async testPerception() {
        try {
            const map = this.getCurrentMap<RpgMap>()
            if (!map) {
                console.log('[PerceptionTestNPC] No map found')
                return null
            }

            // Get NPC position
            const npcPos: Position = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z || 0,
            }

            // Get all objects on the map (players + events)
            const objects = RpgWorld.getObjectsOfMap(map.id)

            // Convert RPGJS objects to rawEntities format
            const rawEntities = objects
                .filter(obj => {
                    // Exclude self
                    if (obj.id === this.id) return false
                    
                    // Only include players and events (not shapes)
                    return obj instanceof RpgPlayer || obj.constructor.name.includes('Event')
                })
                .map(obj => {
                    const entityType = obj instanceof RpgPlayer ? 'player' : 'npc'
                    return {
                        id: obj.id || 'unknown',
                        name: obj.name || 'Unknown',
                        type: entityType as 'player' | 'npc' | 'object',
                        position: {
                            x: obj.position.x,
                            y: obj.position.y,
                            z: obj.position.z || 0,
                        } as Position,
                        // These will be calculated by PerceptionEngine
                        distance: 0,
                        direction: '',
                    }
                })

            // Build PerceptionContext
            const context: PerceptionContext = {
                agentId: this.id || 'perception-test-npc',
                position: npcPos,
                map: {
                    id: map.id,
                    name: (map as any).name || map.id,
                },
                rawEntities,
            }

            // Generate snapshot
            const snapshot = await this.perceptionEngine.generateSnapshot(context)

            // Log results
            console.log('\n' + '='.repeat(60))
            console.log('[PerceptionTestNPC] Perception Snapshot Generated')
            console.log('='.repeat(60))
            console.log('Summary:', snapshot.summary)
            console.log('Entities:', snapshot.entities.length)
            console.log('Token Estimate:', snapshot.tokenEstimate)
            console.log('Timestamp:', new Date(snapshot.timestamp).toISOString())
            
            if (snapshot.entities.length > 0) {
                console.log('\nNearby Entities:')
                snapshot.entities.forEach((entity, i) => {
                    console.log(`  ${i + 1}. ${entity.name} (${entity.type}) - ${entity.distance} tiles ${entity.direction}`)
                })
            } else {
                console.log('\nNo nearby entities detected')
            }
            
            console.log('='.repeat(60) + '\n')

            return snapshot
        } catch (err) {
            console.error('[PerceptionTestNPC] Error generating perception snapshot:', err)
            return null
        }
    }

    onDestroy() {
        // Clean up interval when NPC is destroyed
        if (this.testInterval) {
            clearInterval(this.testInterval)
            this.testInterval = null
        }
    }
}

