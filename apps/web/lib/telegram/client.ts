/* eslint-disable @typescript-eslint/no-unused-vars */
export function createTelegramClientFromEnv() {
  return {
    sendMessage: async (chatId: string, message: string) => {
      console.log(`Mock Telegram Send to ${chatId}: ${message}`);
    },
    answerCallbackQuery: async (callbackQueryId: string, text?: string, showAlert?: boolean) => {
      console.log(`Mock Telegram Answer Callback ${callbackQueryId}: ${text}`);
    }
  };
}

export async function sendReminder(message: string) {
  const client = createTelegramClientFromEnv();
  await client.sendMessage(process.env.TELEGRAM_CHAT_ID || "MOCK_CHAT_ID", message);
}
