## TASK-017: Deploy to Railway

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 6 (Deployment)
- **Type**: Create + Modify
- **Depends on**: TASK-012 (Supabase client), TASK-014 (AgentManager)
- **Blocks**: Nothing
- **Human prerequisite**: Create Railway project and set environment variables

### Context

The game server runs locally via `rpgjs dev`. For others to play, we need a production
deployment. Railway is our chosen platform — it supports Docker deployments, dynamic
port assignment, and environment variable management.

The project already has a working `Dockerfile` (multi-stage, Node 18). The main gaps
are: a health check endpoint for Railway monitoring, CORS tightening for production,
and a `railway.toml` config for build/deploy settings.

### Objective

A production-ready Railway deployment. The game server builds via `npm run build`,
starts via `npm start`, passes a health check, and serves the game to browsers.
Environment variables for Moonshot API and Supabase are configured via Railway dashboard.

### Specifications

**Create files:**
- `railway.toml` — Railway deployment configuration
- `main/server.ts` — Server hook for health check + CORS config (~40 lines)

**Modify files:**
- `Dockerfile` — Add health check instruction, ensure PORT env var used
- `package.json` — Add `engines.node` pin to 18 (match Dockerfile)

**Railway Config (`railway.toml`):**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Health Check Endpoint (`main/server.ts`):**

RPGJS v4 exposes the Express app via server hooks. Add a `/health` route:

```typescript
import { RpgServer, RpgServerEngine } from '@rpgjs/server'

const server: RpgServer = {
  onStart(engine: RpgServerEngine) {
    // Access the underlying Express app
    const app = engine.app  // or engine.io?.httpServer equivalent

    // Health check for Railway
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      })
    })

    console.log('[Server] Health check endpoint registered at /health')
  }
}

export default server
```

> **Note**: The exact way to access Express may vary. Check RPGJS v4 server hook
> API — it may be `engine.app`, `engine.server`, or require importing the Express
> instance from `@rpgjs/server`. The reference code is at
> `docs/rpgjs-reference/packages/server/src/express/server.ts`. If direct Express
> access isn't available through hooks, create a minimal Express middleware that
> intercepts `/health` before RPGJS handles the request.

**Dockerfile Updates:**

```dockerfile
# Ensure PORT is used (not hardcoded 3000)
ENV PORT=3000
EXPOSE $PORT

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1
```

**CORS Configuration (in `main/server.ts` or via `rpg.toml`):**

For MVP, keep CORS open (`*`). When the Lovable frontend URL is known, tighten:

```toml
# rpg.toml (if RPGJS supports it)
[express.socketIo.cors]
origin = "https://your-lovable-app.lovable.app"
methods = ["GET", "POST"]
```

Or configure via server hook if `rpg.toml` doesn't support nested Socket.IO config.

**Package.json Engine Pin:**

```json
{
  "engines": {
    "node": "18"
  }
}
```

### Human Prerequisites (Railway Dashboard)

1. Create a Railway project (web service)
2. Connect to the GitHub repo (or use Docker deploy)
3. Set environment variables:
   - `NODE_ENV` = `production`
   - `MOONSHOT_API_KEY` = your Moonshot API key (required for AI NPCs)
   - `SUPABASE_URL` = your Supabase project URL (optional)
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key (optional)
   - **Do NOT set `PORT`** — Railway assigns it dynamically via `PORT` env var
4. Deploy and verify health check passes

### Acceptance Criteria

- [ ] `railway.toml` exists with build and deploy configuration
- [ ] `main/server.ts` registers `/health` endpoint returning `{ status: 'ok' }`
- [ ] Dockerfile uses `$PORT` env var (not hardcoded 3000)
- [ ] Dockerfile includes HEALTHCHECK instruction
- [ ] `npm run build` succeeds in clean environment
- [ ] `npm start` starts the server and responds on `$PORT`
- [ ] `/health` returns 200 OK
- [ ] Game loads in browser when pointed at Railway URL
- [ ] NPCs spawn and respond (with valid `MOONSHOT_API_KEY`)
- [ ] Graceful fallback when Supabase env vars are missing
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Set up CI/CD pipelines (Railway auto-deploys from the connected branch)
- Add authentication or login — public access for MVP
- Configure custom domains (use Railway's default `*.up.railway.app` domain)
- Add monitoring/alerting beyond the health check (future enhancement)
- Modify the game logic — this task is infrastructure only
- Hardcode any secrets in code or config files

### Reference

- Existing Dockerfile: `Dockerfile`
- RPGJS build output: `dist/server/main.mjs` + `dist/client/`
- Express server source: `docs/rpgjs-reference/packages/server/src/express/server.ts`
- Environment variables: `.env.example`
- Supabase client (graceful fallback): `src/config/supabase.ts`
- LLM client (API key resolution): `src/agents/core/LLMClient.ts`
- RPGJS deployment docs: `docs/rpgjs-guide.md`

### Handoff Notes

_(To be filled by implementer)_
