<template>
  <!-- Root: fixed overlay above the game canvas; pointer-events: auto so GUI receives clicks -->
  <div class="fixed inset-0 w-full h-full" :style="{ pointerEvents: 'auto', zIndex: 9999 }">

    <!-- === PANEL MODE: the builder dashboard overlay === -->
    <div v-if="!placeMode" class="absolute top-0 right-0 z-[200] pointer-events-auto">
      <rpg-window width="340px" position="top">
        <div class="p-3 text-slate-200">

          <!-- Title -->
          <h3 class="m-0 mb-3 text-base font-semibold text-center tracking-wide text-white
                      border-b border-white/10 pb-2">
            Builder &mdash; Place on Map
          </h3>

          <!-- Category tabs -->
          <div class="flex gap-1.5 mb-3 bg-slate-800/50 rounded-lg p-1">
            <button
              :class="[
                'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer border-0',
                category === 'ai-npc'
                  ? 'bg-sky-500/30 text-sky-300 shadow-sm shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              ]"
              @click="category = 'ai-npc'"
            >
              <!-- Small AI icon dot -->
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle"></span>
              AI NPC
            </button>
            <button
              :class="[
                'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer border-0',
                category === 'scripted'
                  ? 'bg-sky-500/30 text-sky-300 shadow-sm shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              ]"
              @click="category = 'scripted'"
            >
              <!-- Small scripted icon dot -->
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle"></span>
              Scripted NPC
            </button>
          </div>

          <!-- Sub-list: AI NPC configs -->
          <div v-if="category === 'ai-npc'" class="max-h-[140px] overflow-y-auto mb-3 space-y-0.5">
            <div
              v-for="cfg in aiNpcConfigs"
              :key="cfg"
              :class="[
                'flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-all duration-100 text-sm',
                selectedId === cfg
                  ? 'bg-sky-500/20 text-sky-200 border-l-2 border-sky-400'
                  : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'
              ]"
              @click="selectItem('ai-npc', cfg)"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400/70 shrink-0"></span>
              {{ cfg }}
            </div>
          </div>

          <!-- Sub-list: Scripted events -->
          <div v-if="category === 'scripted'" class="max-h-[140px] overflow-y-auto mb-3 space-y-0.5">
            <div
              v-for="ev in scriptedEvents"
              :key="ev.id"
              :class="[
                'flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-all duration-100 text-sm',
                selectedId === ev.id
                  ? 'bg-sky-500/20 text-sky-200 border-l-2 border-sky-400'
                  : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'
              ]"
              @click="selectItem('scripted', ev.id)"
            >
              <span class="w-2 h-2 rounded-full bg-amber-400/70 shrink-0"></span>
              {{ ev.name }}
            </div>
          </div>

          <!-- Place action button -->
          <div v-if="selectedId" class="mb-2">
            <button
              class="w-full py-2 rounded-md text-sm font-medium cursor-pointer border-0
                     bg-emerald-500/30 text-emerald-300 shadow-sm
                     hover:bg-emerald-500/40 hover:shadow-emerald-500/20
                     active:translate-y-px transition-all duration-150"
              @click="enterPlaceMode"
            >
              Click Map to Place
            </button>
          </div>

          <!-- Close button -->
          <button
            class="w-full py-1.5 rounded-md text-xs font-medium cursor-pointer border-0
                   bg-red-500/20 text-red-300
                   hover:bg-red-500/30 hover:text-red-200
                   active:translate-y-px transition-all duration-150"
            @click="close"
          >
            Close
          </button>
        </div>
      </rpg-window>
    </div>

    <!-- === PLACE MODE: transparent overlay captures click and propagates to game canvas === -->
    <!-- v-propagate forwards mouse events to the RPGJS canvas so the scene's pointerdown fires -->
    <div
      v-if="placeMode"
      v-propagate
      class="absolute inset-0 w-full h-full pointer-events-auto"
    >
      <div class="absolute top-3 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
        <div class="flex items-center gap-3 px-5 py-2.5 rounded-full
                    bg-slate-900/80 backdrop-blur-sm border border-white/10
                    shadow-lg shadow-black/30 text-sm text-slate-200">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Click on the map to place
          <strong class="text-sky-300 font-semibold">{{ selectedId }}</strong>
          <button
            class="ml-1 px-3 py-1 rounded-md text-xs font-medium cursor-pointer border-0
                   bg-red-500/20 text-red-300
                   hover:bg-red-500/30 hover:text-red-200
                   active:translate-y-px transition-all duration-150"
            @click.stop="cancelPlaceMode"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
// Component name must be 'builder-dashboard' (kebab-case) so the client's Gui
// registry key matches the server's player.gui('builder-dashboard') id.
export default {
  name: 'builder-dashboard',
  inject: ['rpgGuiClose', 'rpgGuiInteraction', 'rpgScene', 'rpgSocket', 'rpgKeypress', 'rpgEngine'],
  props: ['mapId', 'aiNpcConfigs', 'scriptedEvents'],
  data() {
    return {
      category: 'ai-npc',      // Which tab is active: 'ai-npc' or 'scripted'
      selectedType: null,       // The type of the selected item
      selectedId: null,         // The id of the selected item
      placeMode: false,         // Whether we're in "click-to-place" mode
      pointerHandler: null,     // Reference to the scene pointerdown handler (for cleanup)
      keypressSub: null,        // Subscription to keyboard events (for Escape to close)
    }
  },
  mounted() {
    // Escape / Back key closes the builder so the player can always unfreeze
    if (this.rpgKeypress) {
      this.keypressSub = this.rpgKeypress.subscribe(({ control }) => {
        if (control && control.actionName === 'back') {
          this.close()
        }
      })
    }
  },
  methods: {
    // Select an item from the list (AI NPC config or scripted event)
    selectItem(type, id) {
      this.selectedType = type
      this.selectedId = id
    },

    // Enter place mode: register a one-shot pointerdown listener on the scene
    // so the next click on the map places the selected NPC at that tile.
    enterPlaceMode() {
      if (!this.selectedId) return
      this.placeMode = true

      // Wait for Vue to render the place-mode overlay (with v-propagate),
      // then attach a one-shot listener on the game scene's viewport.
      this.$nextTick(() => {
        const scene = this.rpgScene()
        if (!scene || !scene.viewport) {
          console.warn('[BuilderDashboard] No scene or viewport — cannot enter place mode')
          this.placeMode = false
          return
        }

        const tileW = scene.tileWidth || 32
        const tileH = scene.tileHeight || 32
        const vp = scene.viewport

        // The position comes in viewport-local coords.
        // Convert to world (map) coords using the viewport corner offset + scale.
        this.pointerHandler = (position) => {
          const corner = vp.corner
          const scaleX = vp.scale && vp.scale.x != null ? vp.scale.x : 1
          const scaleY = vp.scale && vp.scale.y != null ? vp.scale.y : 1
          const worldX = (corner && corner.x != null ? corner.x : 0) + position.x / scaleX
          const worldY = (corner && corner.y != null ? corner.y : 0) + position.y / scaleY
          const tileX = Math.floor(worldX / tileW) * tileW
          const tileY = Math.floor(worldY / tileH) * tileH

          // Tell the server to place the NPC at this tile
          this.rpgGuiInteraction('builder-dashboard', 'place', {
            mapId: this.mapId,
            x: Math.round(tileX),
            y: Math.round(tileY),
            type: this.selectedType,
            id: this.selectedId,
          })

          // Exit place mode and clean up the listener
          this.placeMode = false
          this.removePointerListener(scene)
        }

        scene.on('pointerdown', this.pointerHandler)
      })
    },

    // Cancel place mode and clean up the scene listener
    cancelPlaceMode() {
      this.placeMode = false
      const scene = this.rpgScene()
      if (scene) this.removePointerListener(scene)
    },

    // Remove the one-shot pointerdown listener from the scene viewport
    removePointerListener(scene) {
      if (this.pointerHandler && scene.viewport) {
        scene.viewport.off('pointerdown', this.pointerHandler)
        this.pointerHandler = null
      }
    },

    // Close the entire builder dashboard
    close() {
      this.cancelPlaceMode()
      this.rpgGuiClose('builder-dashboard')
    },
  },
  beforeUnmount() {
    // Clean up subscriptions and listeners to prevent memory leaks
    if (this.keypressSub && this.keypressSub.unsubscribe) {
      this.keypressSub.unsubscribe()
    }
    const scene = this.rpgScene()
    if (scene) this.removePointerListener(scene)
  },
}
</script>

<style scoped>
/*
  Minimal scoped styles — most styling is done via Tailwind utility classes
  in the template above. Only custom animations and scrollbar tweaks here.
*/

/* Custom scrollbar for the NPC lists */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
