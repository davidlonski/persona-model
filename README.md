# PersonaModel

Cross-device AI reminder agent that watches your digital life and surfaces timely, prioritized reminders on whatever device you're using.

## Problem

Actionable items get buried. A shipping date in an email, a text follow-up, a meeting prep deadline — they live in different silos. PersonaModel is a single agent pipeline that **reads everything** and **reminds at the right moment**.

## Architecture

```
Raw Data Sources (Email, Calendar, Messages, Social Media)
         ↓
   Filtering Agent — extracts actionable items, scores relevance
         ↓ (ITEM: Who | What | When)
   Organizer Agent — time-hierarchy organization (year/month/week/day)
         ↓
   BreakDown Agent — timeline visualizer, delivery scheduling
         ↓
   Delivery (Telegram, Web Dashboard, Desktop Notifications)
```

### Three Agent Pipeline

| Agent | Role | Model |
|---|---|---|
| **Filtering Agent** | Extract action items from raw data, classify by `Who \| What \| When`, score relevance to user | Haiku (fast/cheap) |
| **Organizer Agent** | Organize items into time hierarchy, resolve relative dates, group by day/week/month | Haiku |
| **BreakDown Agent** | Generate timeline views, schedule delivery windows, create briefing documents | Sonnet (complex reasoning) |

## Tech Stack

- **Frontend:** Next.js 15 (App Router)
- **Backend:** Next.js API Routes + OpenClaw agents
- **Database:** PostgreSQL (local)
- **Agent Runtime:** OpenClaw (Claude Sonnet/Haiku via Anthropic)
- **Delivery:** Telegram Bot API
- **Communication:** OpenClaw MCP bridge → Cursor IDE

## Getting Started

```bash
# Prerequisites
# - Node.js 20+
# - PostgreSQL 16+
# - OpenClaw with gateway running

# Install dependencies
cd apps/web && npm install

# Set up database
createdb persona_model
npm run db:migrate

# Start dev server
npm run dev
```

## Project Structure

```
persona-model/
├── apps/web/                  # Next.js dashboard + API
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   └── lib/                   # Shared utilities, DB, agent clients
├── packages/agents/           # Agent definitions + prompts
│   ├── filtering/             # Filtering Agent
│   ├── organizer/             # Organizer Agent
│   └── breakdown/             # BreakDown Agent
├── docs/                      # Architecture, specs, API docs
└── .cursor/                   # Cursor IDE MCP config
```

## Development Workflow

This project uses a multi-agent development pipeline:

1. **Fredrick** (OpenClaw orchestrator) creates and manages GitHub issues
2. **Cursor** (coding agent) picks up issues and implements them
3. Communication flows through OpenClaw MCP bridge
4. PRs are reviewed by Fredrick, feedback loops until merged

## License

MIT
