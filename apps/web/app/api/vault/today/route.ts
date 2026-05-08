import { NextResponse } from "next/server";
import { readDailyNote, readUpcoming, getBacklinks } from "@/lib/obsidian/reader";
import { getDb } from "@/lib/db/index";
import { reminders } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * GET /api/vault/today
 *
 * Exposes today's vault data for the Timeline Visualizer and dashboard.
 * Falls back to database when vault notes don't exist yet.
 */
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // --- Try Obsidian vault first ---
    const vaultNote = await readDailyNote(today);
    const upcomingNotes = await readUpcoming(7);
    const backlinks = await getBacklinks(today);

    if (vaultNote) {
      return NextResponse.json({
        source: "vault",
        date: today,
        reminders: vaultNote.reminders,
        completed: vaultNote.completed,
        upcoming: upcomingNotes.flatMap((n) => n.reminders),
        backlinks,
        breakdown: vaultNote.reminders.slice(0, 3), // Top 3 as quick breakdown
      });
    }

    // --- Fallback: query database ---
    const db = getDb();
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const pendingReminders = await db.query.reminders.findMany({
      where: and(
        eq(reminders.status, "pending"),
        gte(reminders.dueAt, now),
        lte(reminders.dueAt, weekFromNow),
      ),
      orderBy: (r, { asc }) => [asc(r.dueAt)],
      limit: 20,
    });

    const completedToday = await db.query.reminders.findMany({
      where: and(
        eq(reminders.status, "done"),
        gte(reminders.updatedAt, new Date(today)),
      ),
      limit: 20,
    });

    return NextResponse.json({
      source: "database",
      date: today,
      reminders: pendingReminders.map((r) => r.title),
      completed: completedToday.map((r) => r.title),
      upcoming: pendingReminders.map((r) => r.title),
      backlinks: [],
      breakdown: pendingReminders.slice(0, 3).map((r) => r.title),
    });
  } catch (error) {
    console.error("[vault/today] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
