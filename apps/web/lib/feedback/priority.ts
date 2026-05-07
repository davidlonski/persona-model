import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/db/schema";

export async function adjustPriority(reminderId: string, action: string) {
  const db = getDb();
  
  const reminderInfo = await db.query.reminders.findFirst({
    where: eq(reminders.id, reminderId)
  });
  
  if (!reminderInfo || !reminderInfo.priority) return;

  const priorities = ["P0", "P1", "P2", "P3"];
  const currentIndex = priorities.indexOf(reminderInfo.priority);

  if (currentIndex === -1) return;

  let newIndex = currentIndex;

  if (action === "dismiss") {
    // Downgrade priority (higher index number)
    newIndex = Math.min(currentIndex + 1, priorities.length - 1);
  } else if (action === "snooze_1h" || action === "snooze_3h" || action === "snooze") {
    // Bump priority slightly for snoozed items
    newIndex = Math.max(currentIndex - 1, 0);
  }

  if (newIndex !== currentIndex) {
    await db.update(reminders)
      .set({ priority: priorities[newIndex] as any })
      .where(eq(reminders.id, reminderId));
  }
}
