## TASK-017: Deploy to Railway

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 5 (Deployment)
- **Sprint**: 4 (Polish + Deploy)
- **Type**: Create + Modify
- **Depends on**: TASK-012 (Supabase client), TASK-014 (AgentManager)
- **Blocks**: Nothing
- **Human prerequisite**: Create Railway project and set environment variables

### Context

The game server runs locally via `rpgjs dev`. For others to play, we need a production
deployment. Railway is our chosen platform — it supports Docker deployments, dynamic
port assignment, and environment variable management.

The project already has a working `Dockerfile` (multi-stage, Node 18). The main gaps
are: a health check endpoint for Railway monitoring, CORS configuration for the Lovable
frontend, and a `railway.toml` config for build/deploy settings.

### Objective

A production-ready Railway deployment. The game server builds via `npm run build`,
starts via `npm start`, passes a health check, and serves the game to browsers.
Environment variables for Moonshot API and Supabase are configured via Railway dashboard.

### Specifications

**Create:** `railway.toml` — Railway deployment configuration

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

**Create:** `main/server.ts` — Server hook for health check + CORS

This file doesn't exist yet. RPGJS auto-loads `main/server.ts` as a server module hook.
The hook interface provides `onStart(engine: RpgServerEngine)` where `engine.app` is the
Express instance.

**Research-confirmed**: `engine.app` is set at
`docs/rpgjs-reference/packages/server/src/express/server.ts` line 63:
`rpgGame.app = app`. The Express app is available in the `onStart` hook.

```typescript
import { RpgServerEngine } from '@rpgjs/server'

const server = {
  onStart(engine: RpgServerEngine) {
    const app = engine.app

    if (app) {
      // Health check endpoint for Railway
      app.get('/health', (_req, res) => {
        res.status(200).json({
          status: 'ok',
          uptime: Math.round(process.uptime()),
          timestamp: new Date().toISOString()
        })
      })

      console.log('[Server] Health check registered at /health')
    } else {
      console.warn('[Server] Express app not available — health check not registered')
    }
  }
}

export default server
```

**Research-confirmed PORT handling**: RPGJS reads PORT at
`docs/rpgjs-reference/packages/server/src/express/server.ts` line 30:
```typescript
const PORT = process.env.PORT || expressConfig.port || 3000
```

Railway sets `PORT` dynamically. RPGJS already respects `process.env.PORT`.
No code change needed for port binding.

**Research-confirmed CORS handling**: RPGJS Express server applies CORS at
`docs/rpgjs-reference/packages/server/src/express/server.ts` line 47:
```typescript
app.use(cors(expressConfig.cors))
```

And Socket.IO CORS at lines 37-42:
```typescript
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    ...(expressConfig.socketIo || {})
})
```

For MVP, the default `origin: "*"` is acceptable. When the Lovable frontend URL
is known, tighten via `rpg.toml`:

```toml
# Future: tighten CORS when Lovable URL is known
# [express.socketIo.cors]
# origin = "https://your-app.lovable.app"
```

**Modify:** `Dockerfile`

Current Dockerfile (15 lines, works but needs health check + PORT):

```dockerfile
FROM node:18 as build
WORKDIR /build
ADD . /build
RUN npm i
ENV NODE_ENV=production
RUN npm run build

FROM node:18-alpine
WORKDIR /game
COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./
ENV NODE_ENV=production
RUN npm i
EXPOSE 3000
CMD npm start
```

Updated Dockerfile:

```dockerfile
FROM node:18 as build
WORKDIR /build
ADD . /build
RUN npm i
ENV NODE_ENV=production
RUN npm run build

FROM node:18-alpine
WORKDIR /game
COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./
ENV NODE_ENV=production
RUN npm i

# Railway assigns PORT dynamically; default to 3000 for local Docker
ENV PORT=3000
EXPOSE $PORT

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD npm start
```

Changes:
1. `ENV PORT=3000` with `EXPOSE $PORT` (Railway overrides PORT at runtime)
2. `HEALTHCHECK` instruction using wget (alpine has wget, not curl)

**Modify:** `package.json` — Add engine pin

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
   - `SUPABASE_URL` = your Supabase project URL (optional for MVP)
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key (optional)
   - **Do NOT set `PORT`** — Railway assigns it dynamically
4. Deploy and verify health check passes
5. Test: open `https://your-app.up.railway.app` in browser

### Verification Steps

After deployment, test these:

```bash
# 1. Health check
curl https://your-app.up.railway.app/health
# Expected: {"status":"ok","uptime":123,"timestamp":"2026-02-14T..."}

# 2. Game loads (open in browser)
# Expected: RPGJS canvas renders, player spawns on simplemap

# 3. NPCs respond (requires MOONSHOT_API_KEY)
# Expected: Walk to Elder Theron, press Space, get LLM response

# 4. Graceful degradation without Supabase
# Expected: Game works with in-memory fallback if SUPABASE_URL not set
```

### Acceptance Criteria

- [ ] `railway.toml` exists with build and deploy configuration
- [ ] `main/server.ts` registers `/health` endpoint returning `{ status: 'ok' }`
- [ ] Server hook uses `engine.app` (confirmed API) for Express access
- [ ] Dockerfile uses `$PORT` env var (not hardcoded)
- [ ] Dockerfile includes HEALTHCHECK instruction using wget
- [ ] `package.json` has `engines.node: "18"`
- [ ] `npm run build` succeeds in clean environment
- [ ] `npm start` starts the server and responds on `$PORT`
- [ ] `/health` returns 200 OK
- [ ] Game loads in browser when pointed at Railway URL
- [ ] NPCs spawn and respond (with valid `MOONSHOT_API_KEY`)
- [ ] Graceful fallback when Supabase env vars are missing
- [ ] No secrets hardcoded in code or config files
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Set up CI/CD pipelines (Railway auto-deploys from the connected branch)
- Add authentication or login — public access for MVP
- Configure custom domains (use Railway's default `*.up.railway.app`)
- Add monitoring/alerting beyond the health check (future enhancement)
- Modify game logic — this task is infrastructure only
- Hardcode any secrets in code or config files
- Install curl in the alpine image — use wget (already available)
- Add `rpg.toml` CORS restrictions for MVP (keep `origin: "*"`)

### Reference

- Existing Dockerfile: `Dockerfile` (15 lines, multi-stage Node 18)
- Express server setup: `docs/rpgjs-reference/packages/server/src/express/server.ts`
  - Line 30: PORT handling (`process.env.PORT || config.port || 3000`)
  - Line 47: CORS middleware (`app.use(cors(expressConfig.cors))`)
  - Line 63: Express app assignment (`rpgGame.app = app`)
- Server hook interface: `docs/rpgjs-reference/packages/server/src/RpgServer.ts`
  - `onStart(engine: RpgServerEngine)`, `onStep(engine)`, `auth(engine, socket)`
- Sample server hook: `docs/rpgjs-reference/packages/sample2/main/server.ts`
- rpg.toml: `rpg.toml` (current config, 17 lines)
- Environment variables: `.env` or `.env.example`
- Supabase client (graceful fallback): `src/config/supabase.ts`
- LLM client (API key resolution): `src/agents/core/LLMClient.ts`

### Handoff Notes

_(To be filled by implementer)_
