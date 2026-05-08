import { NextResponse } from "next/server";
import { deliverDueReminders } from "@/lib/scheduler/deliver";
import { writeReminderChecklist, appendToDailyNote } from "@/lib/obsidian/writer";

/**
 * Full poll cycle:
 * 1. Fredrick (OpenClaw) polls Gmail/Calendar externally via gws-query
 * 2. Fredrick POSTs raw items to /api/ingest (which triggers filtering)
 * 3. This endpoint delivers due reminders + writes to Obsidian vault
 */
export async function POST(req: Request) {
  try {
    console.log("[pipeline] Running delivery cycle...");

    // --- Deliver due reminders to Telegram ---
    const deliveredCount = await deliverDueReminders();

    // --- Write today's vault status ---
    const today = new Date().toISOString().slice(0, 10);
    await appendToDailyNote(
      today,
      "Pipeline",
      `Delivery cycle ran at ${new Date().toISOString()}. Delivered ${deliveredCount} reminder(s).`
    );

    return NextResponse.json({ success: true, deliveredCount });
  } catch (error) {
    console.error("[pipeline] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
