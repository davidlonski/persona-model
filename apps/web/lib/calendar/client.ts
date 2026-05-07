import { google } from "googleapis";
import { CalendarEvent } from "./types";

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getUpcomingEvents(hoursAhead = 24): Promise<CalendarEvent[]> {
  try {
    const calendar = getCalendarClient();
    const now = new Date();
    const timeMax = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];
    const calendarEvents: CalendarEvent[] = [];

    for (const item of events) {
      if (!item.id) continue;
      // Skip all-day events (they have 'start.date' instead of 'start.dateTime')
      if (item.start?.date) continue;

      const details = await getEventDetails(item.id);
      if (details) calendarEvents.push(details);
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching upcoming calendar events:", error);
    return [];
  }
}

export async function getEventDetails(eventId: string): Promise<CalendarEvent | null> {
  try {
    const calendar = getCalendarClient();
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });

    const item = res.data;
    if (!item.id || !item.start?.dateTime || !item.end?.dateTime) {
      return null;
    }

    const attendees = item.attendees?.map(a => a.email || "Unknown") || [];

    return {
      id: item.id,
      summary: item.summary || "No Title",
      description: item.description || "",
      startTime: item.start.dateTime,
      endTime: item.end.dateTime,
      attendees,
    };
  } catch (error) {
    console.error(`Error fetching details for event ${eventId}:`, error);
    return null;
  }
}
