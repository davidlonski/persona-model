import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Reminder } from "@/lib/db/schema";
import {
  organizerSystemPrompt,
  organizerUserPrompt,
} from "@/lib/agents/organizer/prompts";

const organizeResponseSchema = z.object({
  scheduled: z.array(
    z.object({
      id: z.uuid(),
      remind_at: z.string(),
    }),
  ),
  cancelledAsDuplicate: z.array(z.uuid()),
});

export type OrganizeRemindersResult = {
  scheduled: { id: string; remindAt: Date }[];
  cancelledAsDuplicate: string[];
};

function getHaikuModel(): string {
  return process.env.ORGANIZER_MODEL ?? "claude-3-5-haiku-20241022";
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return text.trim();
}

/**
 * Groups related reminders, assigns consolidated delivery times, and designates
 * duplicate rows to cancel. Uses Claude Haiku with strict JSON validation.
 */
export async function organizeReminders(
  reminders: Reminder[],
): Promise<OrganizeRemindersResult> {
  if (reminders.length === 0) {
    return { scheduled: [], cancelledAsDuplicate: [] };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const nowIso = new Date().toISOString();

  const condensed = reminders.map((r) => ({
    id: r.id,
    who: r.who,
    what: r.what,
    when: r.when?.toISOString() ?? null,
    when_text: r.whenText,
    priority: r.priority,
    relevance_score: r.relevanceScore,
    status: r.status,
  }));

  const remindersJson = JSON.stringify(condensed, null, 0);

  const response = await client.messages.create({
    model: getHaikuModel(),
    max_tokens: 4096,
    system: organizerSystemPrompt(),
    messages: [
      {
        role: "user",
        content: organizerUserPrompt(remindersJson, nowIso),
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Organizer returned no text content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    throw new Error("Organizer returned invalid JSON");
  }

  const validated = organizeResponseSchema.parse(parsed);

  const inputIds = new Set(reminders.map((r) => r.id));
  for (const row of validated.scheduled) {
    if (!inputIds.has(row.id)) {
      throw new Error(`Unknown reminder id in scheduled: ${row.id}`);
    }
  }
  for (const id of validated.cancelledAsDuplicate) {
    if (!inputIds.has(id)) {
      throw new Error(`Unknown reminder id in cancelledAsDuplicate: ${id}`);
    }
  }

  const scheduledIds = new Set(validated.scheduled.map((s) => s.id));
  for (const id of validated.cancelledAsDuplicate) {
    if (scheduledIds.has(id)) {
      throw new Error(`Duplicate id in both scheduled and cancelled: ${id}`);
    }
  }

  if (
    validated.scheduled.length + validated.cancelledAsDuplicate.length !==
    reminders.length
  ) {
    throw new Error("Organizer output must account for every input reminder id");
  }

  const scheduled: { id: string; remindAt: Date }[] = [];
  for (const row of validated.scheduled) {
    const d = new Date(row.remind_at);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid remind_at for ${row.id}: ${row.remind_at}`);
    }
    scheduled.push({ id: row.id, remindAt: d });
  }

  return {
    scheduled,
    cancelledAsDuplicate: validated.cancelledAsDuplicate,
  };
}
