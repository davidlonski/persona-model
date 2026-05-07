# AGENTS.md — PersonaModel

## Project
PersonaModel: Cross-device AI reminder agent with a 3-agent pipeline.

## Architecture
- **Frontend:** Next.js 15 App Router (TypeScript) in `apps/web/`
- **Database:** PostgreSQL via Drizzle ORM — schema in `apps/web/lib/db/schema.ts`
- **Agents:** 3-stage pipeline (Filtering → Organizer → BreakDown) in `packages/agents/`
- **Delivery:** Telegram Bot API for mobile notifications
- **Orchestration:** OpenClaw gateway at localhost:18789

## Code Rules
- TypeScript strict — no `any`
- Drizzle ORM for all DB queries (no raw SQL in handlers)
- Server Components by default, `"use client"` only when needed
- shadcn/ui + Tailwind CSS for components
- Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## Agent Pipeline
1. **Filtering Agent** (Haiku) — extracts `Who | What | When` from raw data, scores relevance
2. **Organizer Agent** (Haiku) — time-hierarchy scheduling (year/month/week/day)
3. **BreakDown Agent** (Sonnet) — generates briefings, timeline views, delivery messages

## Key Files
- `apps/web/lib/db/schema.ts` — database schema (sources, raw_items, reminders, deliveries)
- `packages/agents/*/prompt.md` — agent prompts
- `docs/architecture.md` — full system architecture
- `.cursorrules` — Cursor IDE coding conventions

## Communication with Fredrick (Orchestrator)

This project is orchestrated by **Fredrick**, an OpenClaw agent. You have MCP tools to talk to him.

### MCP Tools Available:
- `conversations_list` — find the Fredrick conversation
- `messages_send` — send a message (status update, question, completion report)
- `messages_read` — read recent messages from Fredrick
- `events_wait` — wait for a response from Fredrick

### Workflow:
1. **Start of task:** Send `[ISSUE #N] starting` with your plan
2. **If blocked:** Send `[ISSUE #N] blocked` with what you need
3. **When done:** Send `[ISSUE #N] done` with summary of changes
4. **Wait for review** before moving to next issue

### Rules:
- Don't guess on business logic — ask Fredrick
- Don't move to the next issue without confirmation
- Report errors that are outside your issue scope
- One logical change per commit: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## Testing
- Test locally before committing
- API routes: use curl or Thunder Client
- Agent prompts: test with sample inputs in `packages/agents/*/examples/`
