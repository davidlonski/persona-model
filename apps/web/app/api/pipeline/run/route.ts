import { NextResponse } from 'next/server';
import { runFullPollCycle } from '../../../../lib/scheduler/poller';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: Request) {
  return POST(req);
}
