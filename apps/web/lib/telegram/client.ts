import { format } from "date-fns";
import type { Reminder } from "@/lib/db/schema";
import { encodeReminderCallback } from "@/lib/telegram/types";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

type SendMessageOptions = {
  parseMode?: "HTML";
  replyMarkup?: {
    inline_keyboard: { text: string; callback_data: string }[][];
  };
};

export class TelegramBotClient {
  private readonly baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: T;
    };
    if (!payload.ok) {
      throw new Error(
        `Telegram API ${method} failed: ${payload.description ?? res.statusText}`,
      );
    }
    return payload.result as T;
  }

  async sendMessage(
    chatId: string,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<{ message_id: number }> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (options.parseMode) body.parse_mode = options.parseMode;
    if (options.replyMarkup) body.reply_markup = options.replyMarkup;
    return this.call("sendMessage", body);
  }

  async sendReminder(chatId: string, reminder: Reminder): Promise<{ message_id: number }> {
    const lines: string[] = [];
    if (reminder.who) {
      lines.push(`<b>${escapeHtml(reminder.who)}</b>`);
    }
    lines.push(escapeHtml(reminder.what));
    const due = reminder.remindAt ?? reminder.when;
    if (due) {
      lines.push(`<i>When:</i> ${escapeHtml(format(new Date(due), "PPpp"))}`);
    }
    if (reminder.whenText) {
      lines.push(`<i>Original:</i> ${escapeHtml(reminder.whenText)}`);
    }
    lines.push(`<i>Priority:</i> ${escapeHtml(reminder.priority)}`);
    const text = lines.join("\n");

    return this.sendMessage(chatId, text, {
      parseMode: "HTML",
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: "Act",
              callback_data: encodeReminderCallback("act", reminder.id),
            },
            {
              text: "Snooze 1h",
              callback_data: encodeReminderCallback("snooze", reminder.id),
            },
            {
              text: "Dismiss",
              callback_data: encodeReminderCallback("dismiss", reminder.id),
            },
          ],
        ],
      },
    });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert?: boolean,
  ): Promise<boolean> {
    const body: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
    };
    if (text) body.text = text;
    if (showAlert) body.show_alert = true;
    return this.call("answerCallbackQuery", body);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createTelegramClientFromEnv(): TelegramBotClient {
  return new TelegramBotClient(getBotToken());
}
