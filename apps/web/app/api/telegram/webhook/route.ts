import { addHours } from "date-fns";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { createTelegramClientFromEnv } from "@/lib/telegram/client";
import {
  parseReminderCallback,
  type TelegramUpdate,
} from "@/lib/telegram/types";

function verifyWebhookSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return null;
  const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = verifyWebhookSecret(request);
  if (authError) return authError;

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callback = update.callback_query;
  if (!callback?.data || !callback.id) {
    return NextResponse.json({ ok: true, handled: false });
  }

  const action = parseReminderCallback(callback.data);
  if (!action) {
    const client = createTelegramClientFromEnv();
    await client.answerCallbackQuery(callback.id, "Unknown action", true);
    return NextResponse.json({ ok: true, handled: "unknown_data" });
  }

  const client = createTelegramClientFromEnv();

  try {
    if (action.kind === "act") {
      await getDb()
        .update(reminders)
        .set({
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, action.reminderId));
      await client.answerCallbackQuery(callback.id, "Marked done.");
    } else if (action.kind === "snooze") {
      const snoozeUntil = addHours(new Date(), 1);
      await getDb()
        .update(reminders)
        .set({
          status: "snoozed",
          dueAt: snoozeUntil,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, action.reminderId));
      await client.answerCallbackQuery(callback.id, "Snoozed for 1 hour.");
    } else {
      await getDb()
        .update(reminders)
        .set({
          status: "dismissed",
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, action.reminderId));
      await client.answerCallbackQuery(callback.id, "Dismissed.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    await client.answerCallbackQuery(callback.id, message, true);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, handled: action.kind });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST for Telegram webhook updates" },
    { status: 405 },
  );
}
