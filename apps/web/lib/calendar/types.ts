export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}

export interface ExtractedReminder {
  source: string;
  title: string;
  body?: string;
  dueAt?: string; // ISO timestamp string
  priority: "P0" | "P1" | "P2" | "P3";
}
