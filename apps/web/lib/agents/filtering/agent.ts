import Anthropic from '@anthropic-ai/sdk';
import { FILTERING_SYSTEM_PROMPT, getFilteringUserPrompt } from './prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface FilteringResult {
  id: string;
  action: "keep" | "dismiss";
  priority: "P0" | "P1" | "P2" | "P3";
}

export async function filterReminders(reminders: any[]): Promise<FilteringResult[]> {
  if (reminders.length === 0) return [];

  const remindersJson = JSON.stringify(
    reminders.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      source: r.source,
      dueAt: r.dueAt,
      priority: r.priority,
    })),
    null,
    2
  );

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      system: FILTERING_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: getFilteringUserPrompt(remindersJson) }
      ],
    });

    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    
    const match = responseText.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]) as FilteringResult[];
    }
    
    return JSON.parse(responseText) as FilteringResult[];
  } catch (error) {
    console.error("Error filtering reminders with Haiku:", error);
    return [];
  }
}
