# IDE ↔ OpenClaw MCP Integration (Cursor + Antigravity)

## Overview

Both Cursor and Google Antigravity connect to the OpenClaw gateway via the MCP (Model Context Protocol) bridge.
This allows the coding agents to communicate with Fredrick (the orchestrator agent)
for task coordination, code review, and clarification.

## How It Works

```
Cursor IDE
    ↓ (stdio)
openclaw mcp serve
    ↓ (WebSocket)
OpenClaw Gateway (localhost:18789)
    ↓
Fredrick Agent Session
```

1. Cursor spawns `openclaw mcp serve` as a child process
2. The bridge connects to the local OpenClaw Gateway via WebSocket
3. Cursor can list conversations, read messages, and send messages
4. Fredrick receives messages and responds through the same route

## Setup

### 1a. Cursor MCP Config

Already configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve"]
    }
  }
}
```

Cursor auto-detects this file when opening the project.

### 1b. Antigravity MCP Config

Option A — Project-level config in `.antigravity/mcp.json` (already in repo):
```json
{
  "servers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve"],
      "transport": "stdio"
    }
  }
}
```

Option B — Global config via Antigravity UI:
1. Open Agent panel → three dots (...) → MCP Servers → Manage MCP Servers
2. Click "View raw config"
3. Add the openclaw server entry above
4. Save and refresh

Option C — Via MCP Store search (if OpenClaw is listed), or manual add.

**Important:** If Antigravity can't find `openclaw` command, use the full path:
```json
{
  "command": "/usr/local/bin/openclaw",
  "args": ["mcp", "serve"]
}
```
This avoids macOS GUI PATH issues.

### 2. Verify Connection

In Cursor, the MCP tools should appear:
- `conversations_list` — list OpenClaw conversations
- `messages_read` — read conversation history
- `messages_send` — send message to Fredrick
- `events_poll` / `events_wait` — watch for new messages

### 3. Workflow

**Fredrick creates GitHub issues → Cursor picks them up → works → reports back via MCP**

Cursor can:
- Ask Fredrick for clarification: `messages_send("Need clarification on issue #5 — should the filtering agent...")`
- Report completion: `messages_send("Completed issue #5 — PR ready for review")`
- Request review: `messages_send("Can you review the schema changes in lib/db/schema.ts?")`

Fredrick can:
- Push task updates to the conversation
- Provide code review feedback
- Share context from other agents or data sources

## Available MCP Tools

| Tool | What it does |
|---|---|
| `conversations_list` | List active OpenClaw conversations |
| `messages_read` | Read recent transcript from a conversation |
| `messages_send` | Send a message back through the conversation route |
| `events_poll` | Poll for new events since a cursor position |
| `events_wait` | Long-poll until next event arrives |
| `permissions_list_open` | List pending approval requests |
| `permissions_respond` | Approve or deny a pending request |

## Notes

- The MCP bridge is stdio-based — Cursor owns the process lifecycle
- Event queue starts when the bridge connects (no replay of older history)
- Use `messages_read` for older transcript history
- The bridge uses the same auth as your local OpenClaw gateway

### MCP `messages_send` — pick the right session

`conversations_list` may return multiple routes (e.g. Discord channels and web UI chat). **MCP-originated sends are only supported on certain channels.** In particular, **do not use a Discord `sessionKey` for `messages_send`** — you will get `unsupported channel: discord`.

**Always choose a webchat-backed conversation:** inspect each item’s `channel` (and `displayName` / `derivedTitle` if needed), pick the **webchat** session, and pass its `sessionKey` as `session_key` to `messages_send`. If unsure, use `conversations_list` with a `channel` filter once you know the webchat channel id OpenClaw uses on your gateway.
