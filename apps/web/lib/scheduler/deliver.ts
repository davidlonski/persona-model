import { db } from "../db";
import { reminders } from "../db/schema";
import { eq, lte, and } from "drizzle-orm";

// Assume this exists from Issue #3
// @ts-ignore
import { sendReminder } from "../telegram/client";

export async function deliverDueReminders() {
  const now = new Date();

  // The Drizzle query using the schema from Issue #2
  // @ts-ignore
  const dueReminders = await db.query.reminders.findMany({
    where: and(
      eq((reminders as any).status, "pending"),
      lte((reminders as any).dueAt, now)
    )
  });

  let deliveredCount = 0;

  for (const reminder of dueReminders) {
    try {
      const message = `Reminder: ${reminder.title}\nDue: ${reminder.dueAt}\n${reminder.body || ""}`;
      
      await sendReminder(message);

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
