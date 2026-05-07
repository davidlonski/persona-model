CREATE TYPE "public"."priority" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'snoozed', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('gmail', 'calendar', 'telegram');--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text,
	"title" text NOT NULL,
	"body" text,
	"due_at" timestamp with time zone,
	"priority" "priority" DEFAULT 'P2' NOT NULL,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "source_type" NOT NULL,
	"last_polled_at" timestamp with time zone,
	"config" jsonb DEFAULT '{}'::jsonb
);
