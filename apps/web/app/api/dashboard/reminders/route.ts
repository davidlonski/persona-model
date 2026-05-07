import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { reminders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const db = getDb();
    
    let data;
    if (statusFilter && statusFilter !== 'all') {
      data = await db.query.reminders.findMany({
        where: eq(reminders.status, statusFilter as any),
        orderBy: [desc(reminders.createdAt)],
      });
    } else {
      data = await db.query.reminders.findMany({
        orderBy: [desc(reminders.createdAt)],
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
