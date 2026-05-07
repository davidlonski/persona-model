import type { Reminder } from "@/lib/db/schema";

export type { Reminder };

/** Telegram `User` object (subset used by webhooks). */
export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

/** Telegram `Chat` object (subset). */
export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
};

/** Telegram `Message` object (subset). */
export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
};

/** Telegram `CallbackQuery` when user taps an inline button. */
export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

/** Top-level `Update` pushed to the webhook. */
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

/** Parsed inline action from `callback_query.data`. */
export type ReminderCallbackAction =
  | { kind: "act"; reminderId: string }
  | { kind: "snooze"; reminderId: string }
  | { kind: "dismiss"; reminderId: string };

const CALLBACK_PREFIX = {
  act: "a:",
  snooze: "s:",
  dismiss: "d:",
} as const;

export function encodeReminderCallback(
  kind: keyof typeof CALLBACK_PREFIX,
  reminderId: string,
): string {
  return `${CALLBACK_PREFIX[kind]}${reminderId}`;
}

export function parseReminderCallback(
  data: string | undefined,
): ReminderCallbackAction | null {
  if (!data) return null;
  if (data.startsWith(CALLBACK_PREFIX.act)) {
    return {
      kind: "act",
      reminderId: data.slice(CALLBACK_PREFIX.act.length),
    };
  }
  if (data.startsWith(CALLBACK_PREFIX.snooze)) {
    return {
      kind: "snooze",
      reminderId: data.slice(CALLBACK_PREFIX.snooze.length),
    };
  }
  if (data.startsWith(CALLBACK_PREFIX.dismiss)) {
    return {
      kind: "dismiss",
      reminderId: data.slice(CALLBACK_PREFIX.dismiss.length),
    };
  }
  return null;
}
