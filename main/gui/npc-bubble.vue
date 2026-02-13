<template>
  <div v-if="message" class="npc-bubble" :class="{ 'fade-out': fading }">
    <div class="bubble-content">
      <span class="npc-name">{{ npcName }}</span>
      <p class="bubble-text">{{ message }}</p>
    </div>
    <div class="bubble-arrow"></div>
  </div>
</template>

<script>
export default {
  name: 'npc-bubble',
  rpgAttachToSprite: true,
  props: ['spriteData'],
  inject: ['rpgScene', 'rpgSocket'],
  data() {
    return {
      message: '',
      npcName: '',
      fading: false,
      fadeTimer: null,
      clearTimer: null,
      socketUnsubscribe: null,
    }
  },
  mounted() {
    const socket = this.rpgSocket()
    if (socket) {
      const handler = (payload) => {
        if (payload && payload.spriteId === this.spriteData.id) {
          this.showMessage(payload.npcName || '', payload.message || '')
        }
      }
      socket.on('npc-bubble:show', handler)
      this.socketUnsubscribe = () => socket.off('npc-bubble:show', handler)
    }
  },
  beforeUnmount() {
    if (this.fadeTimer) clearTimeout(this.fadeTimer)
    if (this.clearTimer) clearTimeout(this.clearTimer)
    if (this.socketUnsubscribe) this.socketUnsubscribe()
  },
  methods: {
    showMessage(npcName, message) {
      if (this.fadeTimer) clearTimeout(this.fadeTimer)
      if (this.clearTimer) clearTimeout(this.clearTimer)
      this.fading = false

      this.npcName = npcName
      this.message = message

      this.fadeTimer = setTimeout(() => {
        this.fading = true
      }, 3500)

      this.clearTimer = setTimeout(() => {
        this.message = ''
        this.fading = false
      }, 4000)
    },
  },
}
</script>

<style scoped>
.npc-bubble {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.5s ease;
}
.npc-bubble.fade-out {
  opacity: 0;
}
.bubble-content {
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  max-width: 200px;
  font-size: 12px;
  text-align: center;
}
.npc-name {
  font-weight: bold;
  font-size: 10px;
  color: #aaddff;
  display: block;
  margin-bottom: 2px;
}
.bubble-arrow {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(0, 0, 0, 0.85);
  margin: 0 auto;
}
</style>
