# PersonaModel — GitHub Issues Backlog

Issues organized by milestone. Each issue is designed to be picked up by Cursor or Antigravity agents independently.

---

## Milestone 1: Foundation

### Issue #1: feat: Initialize Next.js 15 project with TypeScript and Tailwind
**Labels:** foundation, frontend
```
Set up the Next.js 15 project in apps/web/ with:
- App Router
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui initialized
- ESLint configured

Files: apps/web/
Test: `npm run dev` starts without errors, localhost:3000 shows landing page
```

### Issue #2: feat: Set up PostgreSQL with Drizzle ORM schema
**Labels:** foundation, database
```
Set up PostgreSQL database and Drizzle ORM:
1. Install and configure Drizzle ORM with PostgreSQL driver
2. Implement the schema from lib/db/schema.ts (sources, raw_items, reminders, deliveries, user_preferences)
3. Create initial migration
4. Add db:generate, db:migrate, db:studio scripts
5. Create lib/db/index.ts with database client singleton

Prerequisites: PostgreSQL 16 installed, createdb persona_model
Files: apps/web/lib/db/
Test: `npm run db:migrate` runs cleanly, `npm run db:studio` opens Drizzle Studio
```

### Issue #3: feat: Create Telegram bot and delivery client
**Labels:** foundation, delivery
```
Set up Telegram bot for reminder delivery:
1. Create bot via BotFather (document the token setup)
2. Create lib/telegram/client.ts with:
   - sendMessage(chatId, text, options?)
   - sendBriefing(chatId, briefing)
   - handleCallback(update) for snooze/dismiss buttons
3. Add inline keyboard support for actions: ✅ Done, ⏰ Snooze 1h, ❌ Dismiss
4. Create app/api/telegram/webhook/route.ts for incoming updates

Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
Files: apps/web/lib/telegram/, apps/web/app/api/telegram/
Test: Send a test message via the client, receive it on phone
```

### Issue #4: feat: Gmail integration with Google Pub/Sub push notifications
**Labels:** foundation, data-source
```
Set up Gmail as a data source with real-time push:
1. Configure Google Cloud Pub/Sub topic for Gmail push
2. Create app/api/webhooks/gmail/route.ts to receive push notifications
3. Create lib/sources/gmail.ts with:
   - fetchNewEmails(since: Date) — get recent emails via Gmail API
   - parseEmail(raw) — normalize to raw_items schema
   - watchInbox() — set up Gmail push notification watch
4. Store fetched emails in raw_items table
5. Dedup by externalId (Gmail message ID)

Prerequisites: Google Cloud project, OAuth credentials (reuse gws-query setup)
Files: apps/web/lib/sources/gmail.ts, apps/web/app/api/webhooks/gmail/
Test: Receive a new email → webhook fires → raw_item created in DB
```

### Issue #5: feat: Google Calendar integration
**Labels:** foundation, data-source
```
Set up Google Calendar as a data source:
1. Create lib/sources/calendar.ts with:
   - fetchUpcomingEvents(days: number) — get events via Calendar API
   - parseEvent(event) — normalize to raw_items schema
   - watchCalendar() — set up Calendar push notifications
2. Create app/api/webhooks/calendar/route.ts for push notifications
3. Store events in raw_items table
4. Handle recurring events (expand into individual instances)

Files: apps/web/lib/sources/calendar.ts, apps/web/app/api/webhooks/calendar/
Test: Create a calendar event → raw_item appears in DB
```

---

## Milestone 2: Agent Pipeline

### Issue #6: agent: Implement Filtering Agent integration
**Labels:** agent-pipeline
```
Wire up the Filtering Agent to process raw_items:
1. Create lib/agents/filtering.ts with:
   - processItem(rawItem: RawItem) — send to agent, get structured output
   - batchProcess(items: RawItem[]) — process multiple items
2. Call OpenClaw agent (Haiku) with the prompt from packages/agents/filtering/prompt.md
3. Parse agent JSON output into reminders table records
4. Mark raw_items as processed after extraction
5. Handle agent errors gracefully (retry once, log failure)

Integration: OpenClaw gateway at localhost:18789
Files: apps/web/lib/agents/filtering.ts
Test: Insert a raw_item manually → run filtering → reminder created with correct who/what/when/priority
```

### Issue #7: agent: Implement Organizer Agent integration
**Labels:** agent-pipeline
```
Wire up the Organizer Agent to schedule reminders:
1. Create lib/agents/organizer.ts with:
   - organizeReminders(reminders: Reminder[]) — schedule and group
   - resolveRelativeDate(whenText: string, now: Date) — convert relative dates
2. Call OpenClaw agent (Haiku) with the prompt from packages/agents/organizer/prompt.md
3. Update reminders with remindAt timestamps
4. Create delivery records for each scheduled reminder time

Files: apps/web/lib/agents/organizer.ts
Test: Reminder with whenText "next Tuesday" → remindAt set to correct date, delivery records created
```

### Issue #8: agent: Implement BreakDown Agent integration
**Labels:** agent-pipeline
```
Wire up the BreakDown Agent for briefings and timeline:
1. Create lib/agents/breakdown.ts with:
   - generateDailyBriefing(date: Date) — create briefing document
   - generateTimeline(range: {start, end}) — create timeline data
   - formatTelegramMessage(reminder: Reminder) — create delivery text
2. Call OpenClaw agent (Sonnet) with the prompt from packages/agents/breakdown/prompt.md
3. Store briefing data for dashboard display
4. Queue Telegram messages for delivery

Files: apps/web/lib/agents/breakdown.ts
Test: Multiple reminders exist → briefing generated with correct priority sections
```

### Issue #9: feat: Agent pipeline orchestration (trigger → filter → organize → breakdown)
**Labels:** agent-pipeline, integration
```
Wire the full pipeline together:
1. Create lib/agents/pipeline.ts with:
   - runPipeline(rawItemIds: string[]) — full pipeline execution
   - Pipeline: raw_items → Filtering → Organizer → BreakDown → deliveries
2. Create app/api/pipeline/run/route.ts — trigger pipeline via API
3. Add error handling: if any stage fails, log and continue with remaining items
4. Track pipeline runs with agent session IDs on reminder records

Files: apps/web/lib/agents/pipeline.ts, apps/web/app/api/pipeline/
Test: POST /api/pipeline/run → full pipeline executes → reminders + deliveries created
```

---

## Milestone 3: Dashboard UI

### Issue #10: feat: Dashboard page — today's reminders
**Labels:** frontend, dashboard
```
Create the main dashboard page showing today's reminders:
1. app/dashboard/page.tsx — server component
2. Fetch today's reminders grouped by priority (P0, P1, P2, P3)
3. Display with priority colors (🔴 P0, 🟡 P1, 🔵 P2, ⚪ P3)
4. Each item shows: time, who, what, status
5. Action buttons: ✅ Complete, ⏰ Snooze, ❌ Dismiss
6. Show daily briefing summary at top

Components: ReminderCard, PrioritySection, DailyBriefing
Files: apps/web/app/dashboard/, apps/web/components/
Test: With seed data, dashboard renders correctly with grouped items
```

### Issue #11: feat: Timeline page — week and month view
**Labels:** frontend, dashboard
```
Create the timeline visualization page:
1. app/timeline/page.tsx
2. Week view: 7-day grid with items per day, scroll to navigate
3. Month view: calendar grid with item counts, click to expand day
4. Color-coded by priority
5. Toggle between week/month views
6. Click on a day to see all items for that day

Components: WeekView, MonthView, DayDetail, TimelineNav
Files: apps/web/app/timeline/, apps/web/components/timeline/
Test: Navigate between weeks/months, items display correctly
```

### Issue #12: feat: Settings page — sources, delivery, preferences
**Labels:** frontend, settings
```
Create settings page for managing PersonaModel:
1. app/settings/page.tsx with tabbed layout
2. Sources tab: list connected sources, enable/disable, last sync time
3. Delivery tab: configure Telegram, notification preferences, quiet hours
4. Priorities tab: adjust source weights, keyword boosting
5. All settings stored in user_preferences table

Components: SourceCard, DeliveryConfig, PriorityWeights
Files: apps/web/app/settings/, apps/web/components/settings/
Test: Change a setting → persisted in DB → reflected on next load
```

---

## Milestone 4: Delivery & Scheduling

### Issue #13: feat: Delivery scheduler — cron-based reminder delivery
**Labels:** delivery, scheduling
```
Create the delivery scheduler that sends reminders at their scheduled times:
1. Create lib/delivery/scheduler.ts with:
   - checkDueDeliveries() — find deliveries where scheduledAt <= now and status = pending
   - sendDelivery(delivery: Delivery) — route to correct channel
   - markDelivered(deliveryId, messageId) — update status
2. Create app/api/cron/deliver/route.ts — triggered by OpenClaw cron job
3. Handle Telegram delivery with inline action buttons
4. Log all delivery attempts

Integration: OpenClaw cron job runs every minute
Files: apps/web/lib/delivery/, apps/web/app/api/cron/deliver/
Test: Create delivery due now → cron fires → Telegram message received
```

### Issue #14: feat: Morning briefing — daily digest at configured time
**Labels:** delivery, scheduling
```
Implement the daily morning briefing:
1. Create app/api/cron/briefing/route.ts
2. Run BreakDown Agent to generate today's briefing
3. Send via Telegram as a formatted daily digest
4. Include: P0 items, P1 items, weather hook (optional), calendar summary
5. Configurable send time via user_preferences (default: 7:00 AM)

Files: apps/web/app/api/cron/briefing/
Test: Trigger briefing API → Telegram receives formatted daily digest
```

### Issue #15: feat: User actions — snooze, dismiss, complete via Telegram
**Labels:** delivery, interaction
```
Handle user responses to reminder deliveries:
1. Process Telegram callback queries in app/api/telegram/webhook/route.ts
2. ✅ Complete → mark reminder as completed, delivery as acted
3. ⏰ Snooze → create new delivery 1 hour later (or custom time)
4. ❌ Dismiss → mark delivery as dismissed
5. Update dashboard in real-time (or next refresh)

Files: apps/web/app/api/telegram/webhook/route.ts, apps/web/lib/delivery/
Test: Receive Telegram reminder → tap Snooze → new delivery created 1h later
```

---

## Milestone 5: Polish & Scale

### Issue #16: feat: iMessage/SMS source via Mac Messages DB
**Labels:** data-source, macos
```
Add iMessage/SMS as a data source (macOS only):
1. Create lib/sources/imessage.ts
2. Read from ~/Library/Messages/chat.db (SQLite)
3. Poll every 5 minutes for new messages
4. Normalize to raw_items schema
5. Handle group chats (include group name in metadata)

Note: Requires Full Disk Access permission on macOS
Files: apps/web/lib/sources/imessage.ts
Test: Send yourself an iMessage → appears in raw_items after next poll
```

### Issue #17: feat: Source weight configuration and relevance tuning
**Labels:** agent-pipeline, settings
```
Implement configurable source weights for priority scoring:
1. Add source_weights to user_preferences
2. Default weights: medical/legal=90, work=80, family=70, general=50, newsletters=20
3. Keyword boosting: user-defined keywords that increase priority (e.g., "urgent", "deadline")
4. Contact importance: mark specific senders as high/low priority
5. Feed weights into Filtering Agent prompt as context

Files: apps/web/lib/agents/filtering.ts, apps/web/app/settings/
Test: Set a contact as high-priority → their emails get P0/P1 instead of P2
```

### Issue #18: feat: Feedback loop — learn from user actions
**Labels:** agent-pipeline, ml
```
Implement learning from user snooze/dismiss/complete patterns:
1. Track action rates per source, sender, priority level
2. Create lib/feedback/analyzer.ts to compute adjustment suggestions
3. If user consistently dismisses P1 from a source → suggest downgrading to P2
4. If user always acts immediately on P2 from a sender → suggest upgrading
5. Surface suggestions in settings page

Files: apps/web/lib/feedback/
Test: After 20+ interactions, analyzer suggests priority adjustments
```

### Issue #19: docs: API documentation and agent prompt testing guide
**Labels:** documentation
```
Create comprehensive documentation:
1. docs/api.md — all API routes with request/response examples
2. docs/agent-testing.md — how to test agent prompts with sample data
3. docs/deployment.md — how to deploy (local, Docker, production)
4. docs/telegram-setup.md — step-by-step Telegram bot creation
5. Update README.md with setup instructions

Files: docs/
```

### Issue #20: feat: Docker Compose for local development
**Labels:** devops, foundation
```
Create Docker Compose setup for easy local development:
1. docker-compose.yml with:
   - PostgreSQL 16
   - Next.js app (hot reload)
   - Optional: Ollama for local model testing
2. Dockerfile for the web app
3. .dockerignore
4. Init script for database creation + migration

Files: docker-compose.yml, Dockerfile, .dockerignore
Test: `docker compose up` → app running at localhost:3000 with DB ready
```
