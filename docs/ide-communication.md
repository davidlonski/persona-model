# IDE ↔ Fredrick Communication

## How It Works

Cursor and Antigravity communicate with Fredrick (OpenClaw orchestrator) via HTTP webhooks on the local gateway.

```
Cursor/Antigravity agent
    ↓ HTTP POST (curl/fetch)
OpenClaw Gateway (localhost:18789/hooks/agent)
    ↓ routes to dedicated session
Fredrick responds
    ↓ response in the JSON reply
IDE agent reads response
```

## Endpoints

**Base URL:** `http://127.0.0.1:18789/hooks/agent`
**Auth:** `Bearer pmhook_f2d8f5822dbfc0ca17c316024ac6ccd2`

### Send a message to Fredrick

```bash
# From Cursor
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H "Authorization: Bearer pmhook_f2d8f5822dbfc0ca17c316024ac6ccd2" \
  -H "Content-Type: application/json" \
  -d '{"message": "[ISSUE #1] starting — initializing Next.js project", "agentId": "fredrick", "sessionKey": "ide:cursor"}'

# From Antigravity
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H "Authorization: Bearer pmhook_f2d8f5822dbfc0ca17c316024ac6ccd2" \
  -H "Content-Type: application/json" \
  -d '{"message": "[ISSUE #2] starting — setting up Drizzle ORM", "agentId": "fredrick", "sessionKey": "ide:antigravity"}'
```

### Message Format

```
[ISSUE #N] <status>
<details>
```

Statuses: `starting`, `question`, `blocked`, `done`, `error`

## Dedicated Sessions

Each IDE gets its own persistent session:
- **Cursor:** `ide:cursor`
- **Antigravity:** `ide:antigravity`

This keeps conversations separate and traceable.

## Notes
- Messages are processed by Fredrick (the OpenClaw agent, not a human)
- Fredrick reviews work, provides feedback, and assigns next tasks
- The webhook runs async — response comes in the `runId` result
- Gateway must be running at localhost:18789
