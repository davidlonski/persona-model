import { NextRequest, NextResponse } from "next/server";
import { createTelegramClientFromEnv } from "@/lib/telegram/client";
import { parseReminderCallback, type TelegramUpdate } from "@/lib/telegram/types";
import { handleAction } from "@/lib/feedback/handler";

function verifyWebhookSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return null;
  const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = verifyWebhookSecret(request);
  if (authError) return authError;

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callback = update.callback_query;
  if (!callback?.data || !callback.id) {
    return NextResponse.json({ ok: true, handled: false });
  }

  const action = parseReminderCallback(callback.data);
  const client = createTelegramClientFromEnv();

  if (!action) {
    await client.answerCallbackQuery(callback.id, "Unknown action", true);
    return NextResponse.json({ ok: true, handled: "unknown_data" });
  }

  try {
    const resultMsg = await handleAction(action.reminderId, action.kind);
    await client.answerCallbackQuery(callback.id, resultMsg);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    await client.answerCallbackQuery(callback.id, message, true);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, handled: action.kind });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST for Telegram webhook updates" },
    { status: 405 },
  );
}
