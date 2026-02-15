<template>
  <div class="photo-result-overlay">
    <div class="photo-result-panel">
      <div class="photo-result-header">
        <h3>Your photograph</h3>
        <button @click="close" class="close-btn" aria-label="Close">X</button>
      </div>
      <div class="photo-result-body">
        <img
          v-if="imageDataUrl"
          :src="imageDataUrl"
          alt="Generated photo"
          class="photo-result-image"
        />
        <p v-if="prompt" class="photo-result-caption">{{ prompt }}</p>
      </div>
      <div class="photo-result-footer">
        <button @click="close" class="close-btn-bottom">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'photo-result',
  inject: ['rpgGuiClose', 'rpgKeypress'],
  props: {
    imageDataUrl: { type: String, default: '' },
    prompt: { type: String, default: '' },
  },
  data() {
    return {
      keypressSub: null,
    }
  },
  mounted() {
    if (this.rpgKeypress) {
      this.keypressSub = this.rpgKeypress.subscribe(({ inputName }) => {
        if (inputName === 'back' || inputName === 'enter') {
          this.close()
        }
      })
    }
  },
  beforeUnmount() {
    if (this.keypressSub?.unsubscribe) {
      this.keypressSub.unsubscribe()
    }
  },
  methods: {
    close() {
      this.rpgGuiClose('photo-result')
    },
  },
}
</script>

<style scoped>
.photo-result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  font-family: sans-serif;
}
.photo-result-panel {
  background: rgba(20, 20, 30, 0.98);
  color: white;
  border-radius: 12px;
  max-width: min(90vw, 560px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 2px solid rgba(100, 150, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.photo-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.photo-result-header h3 {
  margin: 0;
  font-size: 16px;
}
.close-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 14px;
}
.close-btn:hover,
.close-btn-bottom:hover {
  background: rgba(255, 255, 255, 0.1);
}
.photo-result-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
}
.photo-result-image {
  max-width: 100%;
  max-height: 50vh;
  object-fit: contain;
  border-radius: 8px;
}
.photo-result-caption {
  margin: 12px 0 0;
  font-size: 13px;
  color: #aaa;
  text-align: center;
  max-width: 400px;
}
.photo-result-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
}
.close-btn-bottom {
  background: rgba(100, 150, 255, 0.3);
  border: 1px solid rgba(100, 150, 255, 0.5);
  color: white;
  cursor: pointer;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
}
</style>
