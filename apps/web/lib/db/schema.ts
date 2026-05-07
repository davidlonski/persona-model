import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const priorityEnum = pgEnum("priority", ["P0", "P1", "P2", "P3"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "gmail",
  "calendar",
  "imessage",
  "telegram",
  "slack",
  "manual",
]);
export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "telegram",
  "web",
  "desktop",
  "email",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "snoozed",
  "dismissed",
  "acted",
]);
export const reminderStatusEnum = pgEnum("reminder_status", [
  "active",
  "completed",
  "expired",
  "cancelled",
]);

// Tables
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: sourceTypeEnum("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").default({}),
  enabled: boolean("enabled").default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const rawItems = pgTable("raw_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  externalId: text("external_id"), // dedup key from source
  sourceType: sourceTypeEnum("source_type").notNull(),
  sender: text("sender"),
  subject: text("subject"),
  body: text("body"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}), // source-specific data
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawItemId: uuid("raw_item_id").references(() => rawItems.id),

  // Extracted fields (Who | What | When)
  who: text("who"),
  what: text("what").notNull(),
  when: timestamp("when", { withTimezone: true }),
  whenText: text("when_text"), // original text: "next Tuesday", "EOD"

  // Classification
  priority: priorityEnum("priority").notNull().default("P2"),
  relevanceScore: integer("relevance_score").default(50), // 0-100
  sourceWeight: integer("source_weight").default(50), // 0-100

  // Scheduling
  remindAt: timestamp("remind_at", { withTimezone: true }),
  status: reminderStatusEnum("status").notNull().default("active"),

  // Agent metadata
  filteringAgentRun: text("filtering_agent_run"), // OpenClaw session ID
  organizerAgentRun: text("organizer_agent_run"),
  breakdownAgentRun: text("breakdown_agent_run"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id")
    .references(() => reminders.id)
    .notNull(),
  channel: deliveryChannelEnum("channel").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  messageId: text("message_id"), // external message ID (Telegram, etc.)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Type exports
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type RawItem = typeof rawItems.$inferSelect;
export type NewRawItem = typeof rawItems.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
