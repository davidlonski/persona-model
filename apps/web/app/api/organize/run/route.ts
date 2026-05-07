import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { organizeReminders } from "@/lib/agents/organizer/agent";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/db/schema";

const MAX_BATCH = 50;

/** Spec: priority ≥ 3 — applied as relevance_score ≥ 3 (see TASKS / issue #7). */
const MIN_RELEVANCE = 3;

export async function POST() {
  try {
    const db = getDb();

    const pending = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, "active"),
          sql`coalesce(${reminders.relevanceScore}, 0) >= ${MIN_RELEVANCE}`,
        ),
      )
      .limit(MAX_BATCH);

    if (pending.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "No active reminders matched filters",
      });
    }

    const runId = crypto.randomUUID();
    const result = await organizeReminders(pending);

    for (const row of result.scheduled) {
      await db
        .update(reminders)
        .set({
          remindAt: row.remindAt,
          organizerAgentRun: runId,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, row.id));
    }

    if (result.cancelledAsDuplicate.length > 0) {
      await db
        .update(reminders)
        .set({
          status: "cancelled",
          organizerAgentRun: runId,
          updatedAt: new Date(),
        })
        .where(inArray(reminders.id, result.cancelledAsDuplicate));
    }

    return NextResponse.json({
      ok: true,
      runId,
      inputCount: pending.length,
      scheduled: result.scheduled.length,
      cancelled: result.cancelledAsDuplicate.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Organizer run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
