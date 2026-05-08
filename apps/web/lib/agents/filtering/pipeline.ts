/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Filtering agent pipeline stub.
 * In production, this would call the Filtering Agent (Haiku) via OpenClaw.
 * For now, it marks all items as potential reminders.
 */

export async function runFilteringAgent(items: any[]) {
  return {
    remindersCreated: items.length,
    items: items.map((item: any) => ({ ...item, status: "filtered" })),
  };
}

export async function createRemindersFromGmail(messages: any[]) {
  console.log(`Would create reminders from ${messages.length} Gmail messages`);
  return messages.length;
}
