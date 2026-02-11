import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Vendor Tech Salesman NPC Event — selling the latest tech gadgets.
 */
@EventData({
    name: 'EV-VENDOR',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class VendorEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 180
        this.infiniteMoveRoute([Move.tileRandom()])
        this.attachShape({
            height: 120,
            width: 120,
            positioning: ShapePositioning.Center
        })
        console.log('[Vendor] Initialized — ready to make a sale')
    }

    async onAction(player: RpgPlayer) {
        await player.showText(
            'Hey there! Looking for the latest tech? I\'ve got everything you need!',
            { talkWith: this }
        )
        await player.showText(
            'Best prices in town, guaranteed! What can I interest you in today?',
            { talkWith: this }
        )
    }

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Vendor] Player "${player.name}" entered detection radius — potential customer!`)
    }

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Vendor] Player "${player.name}" left detection radius`)
    }
}

