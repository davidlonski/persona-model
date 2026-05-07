/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getDb } from "../db/index";
import { reminders } from "../db/schema";
import { eq, lte, and } from "drizzle-orm";

import { createTelegramClientFromEnv } from "../telegram/client";

export async function deliverDueReminders() {
  const now = new Date();
  const db = getDb();
  const client = createTelegramClientFromEnv();

  // The Drizzle query using the schema from Issue #2
  // @ts-ignore
  const dueReminders: any[] = await db.query.reminders.findMany({
    where: and(
      eq((reminders as any).status, "pending"),
      lte((reminders as any).remindAt, now)
    )
  });

  let deliveredCount = 0;

  for (const reminder of dueReminders) {
    try {
      const message = `Reminder: ${reminder.what}\nDue: ${reminder.remindAt}\n${reminder.who || ""}`;
      
      await client.sendMessage(process.env.TELEGRAM_CHAT_ID || "", message);

      await db.update(reminders)
        .set({ status: "sent" as any })
        .where(eq(reminders.id, reminder.id));
      
      deliveredCount++;
    } catch (error) {
      console.error(`Failed to deliver reminder ${reminder.id}:`, error);
    }
  }

  return deliveredCount;
}
