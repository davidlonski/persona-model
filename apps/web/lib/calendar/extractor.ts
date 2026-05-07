import Anthropic from '@anthropic-ai/sdk';
import { CalendarEvent, ExtractedReminder } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function extractReminders(event: CalendarEvent): Promise<ExtractedReminder[]> {
  try {
    const prompt = `
You are an AI assistant that extracts reminders and tasks from calendar events.
Analyze the following event and extract any actionable items, tasks, or reminders you find.
If the event implies preparation is needed, or action items are explicitly listed, extract them.
Return the result strictly as a JSON array of objects. Do not include any Markdown formatting or extra text outside the JSON array.
Each object must match this schema:
{
  "source": "calendar",
  "title": "Short, clear title for the reminder",
  "body": "Optional extra details or context",
  "dueAt": "Optional ISO timestamp if a deadline or date is mentioned",
  "priority": "P0" | "P1" | "P2" | "P3" (P0 is most urgent, P3 is least)
}
If no reminders are found, return an empty array [].

Event Title: ${event.summary}
Start Time: ${event.startTime}
End Time: ${event.endTime}
Attendees: ${event.attendees.join(', ')}
Event Description:
${event.description}
`;

    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: "You are a helpful assistant that strictly outputs JSON arrays of reminders.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    
    // Attempt to extract JSON if it was wrapped in markdown
    const match = responseText.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]) as ExtractedReminder[];
    }
    
    return JSON.parse(responseText) as ExtractedReminder[];
  } catch (error) {
    console.error("Error extracting reminders with Haiku:", error);
    return [];
  }
}
