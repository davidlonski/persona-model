# Cursor ↔ OpenClaw MCP Integration

## Overview

Cursor IDE connects to the OpenClaw gateway via the MCP (Model Context Protocol) bridge.
This allows Cursor's coding agent to communicate with Fredrick (the orchestrator agent)
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

### 1. Cursor MCP Config

Create/edit `.cursor/mcp.json` in the project root:

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

For remote gateway (if not on the same machine):

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": [
        "mcp", "serve",
        "--url", "wss://gateway-host:18789",
        "--token-file", "/path/to/gateway.token"
      ]
    }
  }
}
```

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
