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

## Testing
- Test locally before committing
- API routes: use curl or Thunder Client
- Agent prompts: test with sample inputs in `packages/agents/*/examples/`
