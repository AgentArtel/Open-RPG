<template>
  <div class="conv-log-panel">
    <div class="conv-log-header">
      <h3>Conversation Log</h3>
      <button @click="close" class="close-btn">X</button>
    </div>

    <div class="conv-log-tabs">
      <button
        v-for="npc in npcList"
        :key="npc.agentId"
        @click="selectedNpc = npc.agentId"
        :class="{ active: selectedNpc === npc.agentId }"
        class="tab-btn"
      >{{ npc.npcName }}</button>
      <button
        @click="selectedNpc = null"
        :class="{ active: selectedNpc === null }"
        class="tab-btn"
      >All</button>
    </div>

    <div class="conv-log-messages" ref="messageContainer">
      <div v-if="filteredMessages.length === 0" class="empty-state">
        No conversations yet. Talk to an NPC!
      </div>
      <div
        v-for="msg in filteredMessages"
        :key="msg.id"
        class="message"
        :class="msg.role"
      >
        <div class="message-header">
          <span class="message-sender">{{ msg.senderName }}</span>
          <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <p class="message-text">{{ msg.content }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'conversation-log',
  inject: ['rpgGuiClose', 'rpgKeypress'],
  props: ['conversations'],
  data() {
    return {
      selectedNpc: null,
      keypressSub: null,
    }
  },
  computed: {
    npcList() {
      return (this.conversations || []).map(c => ({
        agentId: c.agentId,
        npcName: c.npcName,
      }))
    },
    filteredMessages() {
      const convs = this.conversations || []
      const filtered = this.selectedNpc
        ? convs.filter(c => c.agentId === this.selectedNpc)
        : convs

      return filtered
        .flatMap(c => c.messages.map(m => ({
          ...m,
          id: `${c.agentId}-${m.timestamp}`,
          senderName: m.role === 'assistant' ? c.npcName : 'You',
          npcName: c.npcName,
        })))
        .sort((a, b) => b.timestamp - a.timestamp)
    },
  },
  mounted() {
    if (this.rpgKeypress) {
      this.keypressSub = this.rpgKeypress.subscribe(({ inputName }) => {
        if (inputName === 'conversation-log') {
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
      this.rpgGuiClose('conversation-log')
    },
    formatTime(timestamp) {
      const d = new Date(timestamp)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  },
}
</script>

<style scoped>
.conv-log-panel {
  position: fixed;
  left: 0;
  top: 0;
  width: 360px;
  height: 100vh;
  background: rgba(15, 15, 25, 0.95);
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 200;
  font-family: sans-serif;
  border-right: 2px solid rgba(100, 150, 255, 0.3);
}
.conv-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.conv-log-header h3 {
  margin: 0;
  font-size: 16px;
}
.close-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.conv-log-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.tab-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ccc;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
}
.tab-btn.active {
  background: rgba(100, 150, 255, 0.3);
  color: white;
}
.conv-log-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 0;
  font-size: 14px;
}
.message {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
}
.message.assistant {
  background: rgba(100, 150, 255, 0.15);
}
.message.user {
  background: rgba(255, 255, 255, 0.05);
}
.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.message-sender {
  font-weight: bold;
  font-size: 12px;
  color: #aaddff;
}
.message-time {
  font-size: 11px;
  color: #666;
}
.message-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}
</style>
