import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { sources, reminders } from "@/lib/db/schema";
import { writeReminderChecklist } from "@/lib/obsidian/writer";
import { ensureEntitiesFromReminders } from "@/lib/obsidian/entity-pages";
import { generateRollupAfterWrite } from "@/lib/obsidian/rollups";

/**
 * This endpoint receives raw items (from Gmail, Calendar, etc.)
 * that have been polled by the OpenClaw agent (Fredrick).
 * Fredrick calls gws-query, then POSTs the data here.
 *
 * Items can be:
 * 1. Raw source data → stored in sources table
 * 2. Pre-filtered reminders (with who/what/when) → stored in reminders table + Obsidian vault
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, source, reminders: reminderItems } = body;

    // --- Path A: Raw source data ingestion ---
    if (Array.isArray(items)) {
      const db = getDb();

      const inserted = await db
        .insert(sources)
        .values(
          items.map((item: Record<string, unknown>) => ({
            type: source || "gmail",
            config: item as Record<string, unknown>,
          }))
        )
        .returning({ id: sources.id });

      return NextResponse.json({
        success: true,
        received: items.length,
        inserted: inserted.length,
      });
    }

    // --- Path B: Pre-filtered reminders from Organizer Agent ---
    if (Array.isArray(reminderItems)) {
      const db = getDb();

      // Group by date for Obsidian writes
      const byDate: Record<
        string,
        Array<{ who: string; what: string; when: string; relevance?: string }>
      > = {};

      const dbInserts = reminderItems.map(
        (r: {
          who: string;
          what: string;
          when: string;
          relevance?: string;
          dueAt?: string;
          priority?: string;
          date?: string;
        }) => {
          const date = r.date || new Date().toISOString().slice(0, 10);

          // Accumulate for Obsidian write
          if (!byDate[date]) byDate[date] = [];
          byDate[date].push({
            who: r.who,
            what: r.what,
            when: r.when,
            relevance: r.relevance,
          });

          return {
            source: r.who,
            title: `${r.who} | ${r.what} | ${r.when}`,
            body: r.relevance ? `Relevance: ${r.relevance}` : null,
            dueAt: r.dueAt ? new Date(r.dueAt) : new Date(date),
            priority: (r.priority as "P0" | "P1" | "P2" | "P3") || "P2",
            status: "pending" as const,
          };
        }
      );

      // Insert into DB
      const inserted = await db
        .insert(reminders)
        .values(dbInserts)
        .returning({ id: reminders.id });

      // Write to Obsidian vault (non-blocking — failures logged but don't fail the request)
      for (const [date, items] of Object.entries(byDate)) {
        writeReminderChecklist(date, items).catch((err) => {
          console.error(`[obsidian] Failed to write checklist for ${date}:`, err);
        });

        // Auto-generate entity pages (People/Concepts) and rollups
        ensureEntitiesFromReminders(items.map((item) => ({ ...item, date }))).catch((err) => {
          console.error(`[obsidian] Failed to ensure entity pages for ${date}:`, err);
        });

        generateRollupAfterWrite(date).catch((err) => {
          console.error(`[obsidian] Failed to generate rollup for ${date}:`, err);
        });
      }

      return NextResponse.json({
        success: true,
        remindersCreated: inserted.length,
        vaultWrites: Object.keys(byDate).length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Must provide 'items' or 'reminders' array" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[ingest] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
