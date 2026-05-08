import path from "path";
import os from "os";

/**
 * Application-wide configuration.
 * All env vars are read here — no process.env scattered across modules.
 */
export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // OpenClaw Gateway
  openclawGatewayUrl:
    process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789",

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",

  // Obsidian Vault
  vaultPath:
    process.env.OBSIDIAN_VAULT_PATH ||
    path.join(os.homedir(), "Documents", "SecondBrain"),
  get personaModelPath() {
    return path.join(config.vaultPath, "Daily", "PersonaModel");
  },

  // Runtime environment — controls whether vault filesystem writes happen
  // "local" = write to real Obsidian vault on disk
  // "vercel" = DB only, skip filesystem writes
  runtimeEnv: (process.env.RUNTIME_ENV || "local") as "local" | "vercel",

  // Anthropic (for Claude extractors)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
};

/**
 * Should we write to the Obsidian vault on disk?
 * Only on local runtime where the filesystem is accessible.
 */
export function shouldWriteToVault(): boolean {
  return config.runtimeEnv === "local";
}
