/**
 * Template functions that return strings (no file I/O)
 */

/**
 * Returns markdown for a daily note
 */
export function dailyNoteTemplate(
  date: string, 
  dayName: string, 
  week: string, 
  month: string, 
  reminders?: string, 
  completed?: string, 
  notes?: string
): string {
  return `---
date: "${date}"
source: personamodel
tags: [reminder, daily]
week: "${week}"
month: "${month}"
---

# ${date} — ${dayName}

## Reminders
${reminders || "No reminders yet."}

## Completed
${completed || "Nothing completed yet."}

## Notes
${notes || ""}
`;
}

/**
 * Returns markdown for a weekly rollup
 */
export function weeklyRollupTemplate(
  week: string, 
  month: string, 
  year: number, 
  thisWeek?: string, 
  completed?: string, 
  upcoming?: string
): string {
  return `---
type: weekly-rollup
week: "${week}"
month: "${month}"
---

# Week ${week} — ${month} ${year}

## This Week
${thisWeek || "No items."}

## Completed
${completed || "Nothing completed."}

## Upcoming
${upcoming || "No upcoming items."}
`;
}

/**
 * Returns markdown for a monthly rollup
 */
export function monthlyRollupTemplate(
  month: string, 
  year: number, 
  summary?: string, 
  completed?: string, 
  upcoming?: string
): string {
  return `---
type: monthly-rollup
month: "${month}"
year: ${year}
---

# ${month} ${year}

## Summary
${summary || ""}

## Completed
${completed || "Nothing completed."}

## Upcoming
${upcoming || "No upcoming items."}
`;
}