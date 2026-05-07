import { NextResponse } from 'next/server';
import { runFullPollCycle } from '../../../../lib/scheduler/poller';

export async function POST(req: Request) {
  try {
    const result = await runFullPollCycle();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in pipeline route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
