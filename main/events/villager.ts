import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class VillagerEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
    }
    async onAction(player: RpgPlayer) {
        console.log('[Villager EV-1] Player', player.name, 'talked to me')
        await player.showText('I give you 10 gold.', {
            talkWith: this
        })
        player.gold += 10
        await player.showText('Spend it well at the market!', {
            talkWith: this
        })
    }
} 