# PersonaModel Architecture

## Overview

PersonaModel is an always-on agent that monitors your "second brain" — emails, messages, calendar events, notes, and project files — extracts anything that implies a future action, and surfaces it as a timely reminder on whatever device you're using.

## Core Architecture (from draw.io spec)

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│    User      │ ←→ │ Second Brain │ ←→ │    Agent      │ ←→ │ Data Sources │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

**Trigger Flow:**
1. Data Sources → Agent: "Trigger new data" (webhook/poll)
2. Agent → Agent: "Filter Data" (3-stage pipeline)
3. Agent → Second Brain: "Organize Data" (time-hierarchy storage)

## Three-Agent Pipeline

### 1. Filtering Agent
- **Input:** Raw data from sources (emails, messages, calendar events)
- **Process:** Extract actionable items using `ITEM: Who | What | When` schema
- **Output:** Scored, structured reminder candidates
- **Model:** Claude Haiku (fast, cheap — runs on every new data event)

**Example filtering:**
```
Input:  "Dentist Email: Hi, reminder about dentist appointment Thursday 2pm"
Output: { who: "Dentist", what: "appointment", when: "Thursday 2pm", priority: "P0", source: "email" }

Input:  "Groupchat family: anyone want to do dinner this weekend?"
Output: { who: "Family group", what: "dinner plan", when: "this weekend", priority: "P2", source: "message" }
```

**Relevance scoring:** Each item gets a relevance score based on:
- Explicit deadline mentioned (high)
- Promised action from user (high)
- Promised action from someone else user relies on (medium)
- Recurring pattern not yet completed (medium)
- Soft commitment / low stakes (low)

### 2. Organizer Agent
- **Input:** Filtered, scored reminder candidates
- **Process:** Organize into time hierarchy (Year → Month → Week → Day)
- **Output:** Scheduled reminders with delivery windows
- **Model:** Claude Haiku

**Time hierarchy:**
```
2026/
├── May/
│   ├── Week 1 (May 4-10)/
│   │   ├── Mon May 5: Meeting with James at 7pm
│   │   ├── Tue May 6: Sarah's birthday in 5 days → reminder now
│   │   └── Wed May 7: Garbage Day
│   └── Week 2 (May 11-17)/
│       └── Sat May 11: Sarah's birthday → reminder + gift prep
└── June/
    └── ...
```

**Scheduling logic:**
- "Ship date Tuesday" → reminders on Monday PM + Tuesday AM
- "Meeting Thursday 8am" → prep reminder Wednesday 5pm
- "Birthday in 2 weeks" → reminder 3 days before + day of

### 3. BreakDown Agent
- **Input:** Organized, scheduled reminders
- **Process:** Generate timeline visualizations, daily briefings, delivery scheduling
- **Output:** BreakDown.md documents, scheduled Telegram messages, dashboard data
- **Model:** Claude Sonnet (needs complex reasoning for briefing generation)

**BreakDown.md example:**
```markdown
# Tuesday May 6, 2026 — Daily Briefing

## 🔴 P0 (Today)
- 2:00 PM — Dentist appointment (Dr. Smith, 123 Main St)
- 5:00 PM — Prep for Wegmans walkthrough tomorrow (review Lisa's threads)

## 🟡 P1 (This Week)
- Sarah's birthday Saturday — gift not purchased yet
- Handwheels shipment expected Wednesday (Hovey @ F.W. Webb)

## 🔵 P2 (Upcoming)
- Family dinner this weekend — no plan confirmed yet
```

## Data Sources

### MVP (v1)
| Source | Method | Trigger |
|---|---|---|
| Gmail | Google Pub/Sub push notifications | Webhook on new email |
| Google Calendar | Google Calendar API + webhooks | Webhook on event change |
| iMessage/SMS | Mac Messages SQLite DB | Poll every 5 min |

### v2
| Source | Method |
|---|---|
| Telegram messages | Bot API webhooks |
| Slack | Slack Events API |
| Apple Notes | AppleScript bridge |
| Obsidian vault | File watcher |
| Voice memos | Whisper transcription |

## Priority System

| Tier | Criteria | Delivery |
|---|---|---|
| **P0** | Today/tomorrow + high-weight source | Immediate Telegram ping |
| **P1** | This week + normal weight | Morning briefing |
| **P2** | Soft commitments, low-stakes | Weekly digest |
| **P3** | Reference only | Silent log (dashboard only) |

**Source weights** (configurable):
- Medical/legal/financial: high
- Work contacts (known): high
- Family/close friends: medium
- General contacts: normal
- Newsletters/marketing: low (usually filtered out)

## Delivery Channels

| Channel | Platform | Best For |
|---|---|---|
| Telegram Bot | All (phone, desktop) | P0 pings, daily briefing |
| Web Dashboard | Browser | Full timeline view, management |
| Desktop notification | macOS/Windows | Active session nudges |
| Email digest | All | Weekly P2 backlog review |

## Database Schema (high level)

```
sources          → connected data source configs
raw_items        → ingested data (normalized)
reminders        → extracted + scored + scheduled items
deliveries       → delivery log (sent/snoozed/dismissed/acted)
user_preferences → settings, weights, delivery prefs
```

## Integration with OpenClaw

PersonaModel agents run inside the existing OpenClaw infrastructure:

```
Gmail Webhook → OpenClaw Gateway (webhook hook)
    → Triggers Filtering Agent (Haiku)
    → Pipes to Organizer Agent (Haiku)
    → Pipes to BreakDown Agent (Sonnet)
    → Stores results in PostgreSQL
    → Schedules delivery via cron/Telegram
```

**OpenClaw integration points:**
- **Webhooks:** Gmail/Calendar push notifications hit OpenClaw hooks
- **Cron jobs:** Scheduled delivery, periodic polling of non-webhook sources
- **Agent sessions:** Each pipeline run uses isolated agent sessions
- **MCP bridge:** Cursor IDE connects via `openclaw mcp serve` for development

## Success Criteria
- Coverage: ≥90% of actionable items caught
- Precision: ≤1 false positive per day
- Latency: ≤5 min from data source event to reminder scheduled
- Trust: user relies on it after 30 days
