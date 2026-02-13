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
  },
}

export default server
