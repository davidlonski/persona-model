import { and, eq, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { createTelegramClientFromEnv } from "@/lib/telegram/client";

/**
 * Sends reminders whose `remind_at` is due via Telegram, then marks them completed.
 */
export async function deliverDueReminders(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID is not set");
  }

  const due = await db.query.reminders.findMany({
    where: and(
      eq(reminders.status, "active"),
      isNotNull(reminders.remindAt),
      lte(reminders.remindAt, now),
    ),
  });

  const client = createTelegramClientFromEnv();

  let deliveredCount = 0;
  for (const reminder of due) {
    try {
      await client.sendReminder(chatId, reminder);
      await db
        .update(reminders)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(reminders.id, reminder.id));
      deliveredCount++;
    } catch (error) {
      console.error(`Failed to deliver reminder ${reminder.id}:`, error);
    }
  }

  return deliveredCount;
}
