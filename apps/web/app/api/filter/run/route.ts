import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { reminders } from '../../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { filterReminders } from '../../../../lib/agents/filtering/agent';

export async function POST(req: Request) {
  try {
    // Fetch up to 20 pending reminders
    const pendingReminders = await db.query.reminders.findMany({
      where: eq(reminders.status, "pending"),
      limit: 20,
      orderBy: [asc(reminders.createdAt)],
    });

    if (pendingReminders.length === 0) {
      return NextResponse.json({ success: true, message: "No pending reminders to filter", processed: 0 });
    }

    const results = await filterReminders(pendingReminders);

    let updatedCount = 0;
    
    // Update the DB based on results
    for (const res of results) {
      const newStatus = res.action === "dismiss" ? "dismissed" : "pending";

      await db.update(reminders)
        .set({ 
          status: newStatus as any, 
          priority: res.priority 
        })
        .where(eq(reminders.id, res.id));
        
      updatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingReminders.length, 
      updated: updatedCount 
    });
  } catch (error) {
    console.error("Error in filter run route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
