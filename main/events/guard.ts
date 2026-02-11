import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Guard NPC Event — demonstrates the reusable NPC pattern with a specific role.
 *
 * This guard:
 * - Patrols a specific area (random movement)
 * - Has a larger detection radius (150px vs 100px) — guards are more alert
 * - Responds with guard-themed dialogue
 * - Logs player proximity for future agent integration
 */
@EventData({
    name: 'EV-GUARD',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class GuardEvent extends RpgEvent {

    /**
     * Called when the guard is first created on the map.
     * Sets up the guard's appearance, patrol behavior, and detection zone.
     */
    onInit() {
        // Set the guard's sprite — using 'female' graphic (default for all NPCs)
        this.setGraphic('female')

        // Guards move slightly slower and more deliberately
        this.speed = 1
        this.frequency = 300  // Slower than test NPC (300ms vs 200ms)

        // Start infinite random patrol — guard walks around their post
        this.infiniteMoveRoute([Move.tileRandom()])

        // Attach a larger detection shape — guards are more alert
        // 150x150 pixel detection radius (vs 100x100 for test NPC)
        this.attachShape({
            height: 150,
            width: 150,
            positioning: ShapePositioning.Center
        })

        console.log('[Guard] Initialized — patrolling and watching for intruders')
    }

    /**
     * Called when a player faces the guard and presses the action key.
     * Guard responds with role-appropriate dialogue.
     */
    async onAction(player: RpgPlayer) {
        await player.showText(
            'Halt! This area is under guard. State your business.',
            { talkWith: this }
        )
        await player.showText(
            'I patrol these grounds to ensure the safety of all travelers.',
            { talkWith: this }
        )
    }

    /**
     * Called when a player enters the guard's detection zone.
     * Guards are alert — they notice people approaching.
     */
    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Guard] Player "${player.name}" entered detection radius — keeping watch`)
    }

    /**
     * Called when a player leaves the guard's detection zone.
     * Guard returns to normal patrol.
     */
    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Guard] Player "${player.name}" left detection radius — resuming patrol`)
    }
}

