import { getDb } from "../db/index";
import { reminders } from "../db/schema";
import { eq, lte, and } from "drizzle-orm";
import { createTelegramClientFromEnv } from "../telegram/client";

export async function deliverDueReminders() {
  const now = new Date();
  const db = getDb();
  const client = createTelegramClientFromEnv();

  const dueReminders = await db.query.reminders.findMany({
    where: and(
      eq(reminders.status, "pending"),
      lte(reminders.dueAt, now)
    ),
  });

  let deliveredCount = 0;

  for (const reminder of dueReminders) {
    try {
      const message = `Reminder: ${reminder.title}\nDue: ${reminder.dueAt}\n${reminder.body || ""}`;

      await client.sendMessage(
        process.env.TELEGRAM_CHAT_ID || "",
        message
      );

      await db
        .update(reminders)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(reminders.id, reminder.id));

      deliveredCount++;
    } catch (error) {
      console.error(`Failed to deliver reminder ${reminder.id}:`, error);
    }
  }

  return deliveredCount;
}
