import { NextResponse } from 'next/server';
import { getUpcomingEvents } from '../../../../lib/calendar/client';
import { extractReminders } from '../../../../lib/calendar/extractor';
import { db } from '../../../../lib/db';
import { reminders } from '../../../../lib/db/schema';

export async function POST(req: Request) {
  try {
    const events = await getUpcomingEvents(24);
    let totalInserted = 0;

    for (const event of events) {
      const extracted = await extractReminders(event);
      
      for (const ext of extracted) {
        await db.insert(reminders).values({
          source: ext.source || "calendar",
          title: ext.title,
          body: ext.body || null,
          dueAt: ext.dueAt ? new Date(ext.dueAt) : null,
          priority: ext.priority || "P2",
          status: "pending",
        });
        totalInserted++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedEvents: events.length, 
      insertedReminders: totalInserted 
    });
  } catch (error) {
    console.error("Error in Calendar poll route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
