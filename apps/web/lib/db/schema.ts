import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["P0", "P1", "P2", "P3"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "gmail",
  "calendar",
  "telegram",
]);
export const reminderStatusEnum = pgEnum("reminder_status", [
  "pending",
  "snoozed",
  "done",
  "dismissed",
]);

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: sourceTypeEnum("type").notNull(),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
  config: jsonb("config").default({}),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source"),
  title: text("title").notNull(),
  body: text("body"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  priority: priorityEnum("priority").notNull().default("P2"),
  status: reminderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Type exports
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
