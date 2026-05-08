/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";

export async function POST(req: Request) {
  try {
    // Use OpenClaw gateway's gws-query via the gateway API
    // The gateway can execute gws-query commands
    const gwsCommand = `gws-query gmail users messages list --params '{"userId":"me","maxResults":20}'`;

    // Call OpenClaw gateway exec endpoint
    const execRes = await fetch(`${GATEWAY_URL}/api/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: gwsCommand }),
    });

    const execData = await execRes.json();

    if (!execRes.ok) {
      console.error("Gateway exec failed:", execData);
      return NextResponse.json(
        { success: false, error: "Failed to poll Gmail" },
        { status: 500 }
      );
    }

    // Parse messages and create reminders
    const messages = execData.result || [];
    const { createRemindersFromGmail } = await import("@/lib/agents/filtering/pipeline");
    const count = await createRemindersFromGmail(messages);

    return NextResponse.json({ success: true, polled: count });
  } catch (error) {
    console.error("Gmail poll error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
