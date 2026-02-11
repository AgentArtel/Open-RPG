import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Test NPC Event — validates RPGJS event system APIs.
 *
 * This NPC demonstrates:
 * - Random patrol movement via infiniteMoveRoute
 * - Player interaction via onAction hook
 * - Proximity detection via attachShape + onDetectInShape/onDetectOutShape
 *
 * It uses EventMode.Shared (default) so all players see the same NPC state.
 * This pattern will serve as the foundation for AI-controlled NPCs later.
 */
@EventData({
    name: 'EV-TEST-NPC',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class TestNpcEvent extends RpgEvent {

    /**
     * Called when the event is first created on the map.
     * Sets up the NPC's appearance, movement, and detection shape.
     */
    onInit() {
        // Set the NPC's sprite — reuse the existing 'female' graphic
        this.setGraphic('female')

        // Configure movement speed and frequency
        // speed = how fast the NPC moves (pixels per tick)
        // frequency = delay in ms between each movement step
        this.speed = 1
        this.frequency = 200

        // Start infinite random patrol — NPC walks one tile in a random
        // direction (up/down/left/right), then picks another random direction
        this.infiniteMoveRoute([Move.tileRandom()])

        // Attach a detection shape centered on the NPC.
        // When a player enters this 100x100 pixel area, onDetectInShape fires.
        // When they leave, onDetectOutShape fires.
        this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })

        console.log('[TestNPC] Initialized — patrolling and listening for players')
    }

    /**
     * Called when a player faces this NPC and presses the action key (space/enter).
     * Shows a static dialogue box for now — will be replaced with LLM-generated
     * dialogue once the agent system is wired up.
     */
    async onAction(player: RpgPlayer) {
        await player.showText(
            'Hello, traveler! I\'m a test NPC. I patrol this area randomly and can detect when you\'re nearby.',
            { talkWith: this }
        )
        await player.showText(
            'In the future, I\'ll be powered by an AI agent that can think and remember our conversations!',
            { talkWith: this }
        )
    }

    /**
     * Called when a player enters the detection shape attached to this NPC.
     * This is the foundation for the future agent proximity trigger —
     * it will eventually fire an AgentEvent to wake up the AI agent.
     */
    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[TestNPC] Player "${player.name}" entered detection radius`)
    }

    /**
     * Called when a player leaves the detection shape attached to this NPC.
     * Logs the departure — future agent system will use this to end interactions.
     */
    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[TestNPC] Player "${player.name}" left detection radius`)
    }
}

