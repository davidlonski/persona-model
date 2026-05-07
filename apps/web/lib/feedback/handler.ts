import { addHours } from "date-fns";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { adjustPriority } from "./priority";

export async function handleAction(reminderId: string, action: string) {
  const db = getDb();
  const now = new Date();

  await adjustPriority(reminderId, action);

  if (action === "act") {
    await db.update(reminders)
      .set({ status: "completed" as any, updatedAt: now })
      .where(eq(reminders.id, reminderId));
    return "Marked completed.";
  } else if (action === "snooze" || action === "snooze_1h") {
    const snoozeUntil = addHours(now, 1);
    await db.update(reminders)
      .set({
        remindAt: snoozeUntil,
        when: snoozeUntil,
        updatedAt: now,
      } as any)
      .where(eq(reminders.id, reminderId));
    return "Snoozed for 1 hour.";
  } else if (action === "snooze_3h") {
    const snoozeUntil = addHours(now, 3);
    await db.update(reminders)
      .set({
        remindAt: snoozeUntil,
        when: snoozeUntil,
        updatedAt: now,
      } as any)
      .where(eq(reminders.id, reminderId));
    return "Snoozed for 3 hours.";
  } else if (action === "dismiss") {
    await db.update(reminders)
      .set({ status: "cancelled" as any, updatedAt: now })
      .where(eq(reminders.id, reminderId));
    return "Dismissed.";
  }

  return "Unknown action.";
}
