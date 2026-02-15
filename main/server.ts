import type { RpgServerEngine } from '@rpgjs/server'

const server = {
  onStart(engine: RpgServerEngine) {
    const app = engine.app

    if (app) {
      app.get('/health', (_req, res) => {
        res.status(200).json({
          status: 'ok',
          uptime: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        })
      })
      console.log('[Server] Health check registered at /health')
    } else {
      console.warn('[Server] Express app not available — health check not registered')
    }

    if (process.env.SYNC_TMX_ON_START === 'true') {
      console.log('[TMX-Sync] Syncing maps on server start...')
      import('../src/sync/syncMapEntities').then((m) => m.syncAllMaps()).then((results) => {
        const total = results.reduce((a, r) => a + r.entitiesCreated + r.entitiesUpdated, 0)
        console.log(`[TMX-Sync] Done. ${total} entities synced across ${results.length} map(s).`)
      }).catch((err) => {
        console.error('[TMX-Sync] Non-blocking sync failed:', err instanceof Error ? err.message : String(err))
      })
    }
  },
}

export default server
