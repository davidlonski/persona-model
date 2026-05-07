import { NextResponse } from 'next/server';
import { deliverDueReminders } from '../../../../lib/scheduler/deliver';

export async function POST(req: Request) {
  try {
    const deliveredCount = await deliverDueReminders();
    return NextResponse.json({ success: true, deliveredCount });
  } catch (error) {
    console.error("Error in deliver route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
