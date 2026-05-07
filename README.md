# PersonaModel

PersonaModel is a cross-device AI reminder agent powered by a 3-agent pipeline. It automatically polls Gmail and Google Calendar, extracts actionable reminders via Claude Haiku, and orchestrates delivery via Telegram.

## Environment Variables

Copy the `.env.example` file to `.env` and fill in the required variables:

- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/persona_model`).
- `OPENCLAW_GATEWAY_URL`: Local orchestrator URL (defaults to `http://127.0.0.1:18789`).
- `TELEGRAM_BOT_TOKEN`: Token obtained from BotFather on Telegram.
- `TELEGRAM_CHAT_ID`: Your personal chat ID where reminders should be sent.
- `TELEGRAM_WEBHOOK_SECRET`: A random secret string to authenticate Telegram webhooks.
- `GOOGLE_CLIENT_ID`: OAuth client ID for Gmail/Calendar API access.
- `GOOGLE_CLIENT_SECRET`: OAuth client secret.
- `GOOGLE_PUBSUB_TOPIC`: Google Pub/Sub topic name for Gmail push notifications.
- `GOOGLE_REFRESH_TOKEN`: OAuth refresh token to keep the agent authenticated indefinitely.
- `ANTHROPIC_API_KEY`: API key for Claude 3 Haiku agent extraction and filtering.

## Setup Guide

### 1. Database Migrations
We use Drizzle ORM to manage the database schema. Ensure PostgreSQL is running, then apply migrations:
```bash
cd apps/web
npm install
npm run db:push
```

### 2. Telegram Webhook Registration
To receive interactions (Act, Snooze, Dismiss), set the webhook URL pointing to your deployment:
```bash
curl -F "url=https://your-vercel-app.vercel.app/api/telegram/webhook" \
     -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
     https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook
```

### 3. Gmail/Calendar OAuth Setup
- Create a project in Google Cloud Console.
- Enable the Gmail API and Google Calendar API.
- Create OAuth credentials (Desktop/Web app) and retrieve your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Obtain a `GOOGLE_REFRESH_TOKEN` using the Google OAuth playground.

### 4. Vercel Deployment
1. Import the repository into Vercel.
2. In the Vercel dashboard, navigate to **Settings > Environment Variables**.
3. Add ALL the environment variables listed above (do NOT commit secrets to the repository).
4. The `vercel.json` file configures Cron Jobs to automatically trigger polling and delivery.
5. Deploy the application.

## Pipeline Orchestration
The pipeline runs automatically via Vercel Cron triggers:
- **Poll Cycle (Every 15 mins)**: Triggers `GET /api/pipeline/run` to extract and filter new events.
- **Delivery Cycle (Every 5 mins)**: Triggers `GET /api/deliver/run` to send due reminders to Telegram.
