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

type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

type SendMessageOptions = {
  parseMode?: "HTML" | "MarkdownV2";
  replyMarkup?: {
    inline_keyboard: InlineKeyboardButton[][];
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
    if (options.parseMode) {
      body.parse_mode = options.parseMode;
    }
    if (options.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }
    return this.call("sendMessage", body);
  }

  /**
   * Sends a reminder with Act / Snooze 1h / Dismiss inline actions.
   */
  async sendReminder(chatId: string, reminder: Reminder): Promise<{ message_id: number }> {
    const lines: string[] = [];
    lines.push(`<b>${escapeHtml(reminder.title)}</b>`);
    if (reminder.body) {
      lines.push(escapeHtml(reminder.body));
    }
    if (reminder.dueAt) {
      lines.push(
        `<i>Due:</i> ${escapeHtml(format(new Date(reminder.dueAt), "PPpp"))}`,
      );
    }
    lines.push(`<i>Priority:</i> ${escapeHtml(reminder.priority)}`);
    const text = lines.join("\n");

    const replyMarkup = {
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
    };

    return this.sendMessage(chatId, text, {
      parseMode: "HTML",
      replyMarkup,
    });
  }

  /** Required after inline button presses to stop the loading state on the button. */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert?: boolean,
  ): Promise<boolean> {
    const body: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
    };
    if (text) {
      body.text = text;
    }
    if (showAlert) {
      body.show_alert = true;
    }
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
