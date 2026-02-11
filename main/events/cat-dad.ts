import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Proud Cat Dad NPC Event — loves talking about their cat.
 */
@EventData({
    name: 'EV-CAT-DAD',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class CatDadEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 200
        this.infiniteMoveRoute([Move.tileRandom()])
        this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
        console.log('[CatDad] Initialized — ready to show off cat photos')
    }

    async onAction(player: RpgPlayer) {
        await player.showText(
            'Oh! Do you want to see pictures of my cat?',
            { talkWith: this }
        )
        await player.showText(
            'She\'s the most beautiful, smartest, funniest cat in the whole world! I\'m so proud to be her human.',
            { talkWith: this }
        )
    }

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[CatDad] Player "${player.name}" entered detection radius — cat story incoming!`)
    }

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[CatDad] Player "${player.name}" left detection radius`)
    }
}

