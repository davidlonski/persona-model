import fs from "fs/promises";
import path from "path";
import { config, shouldWriteToVault } from "../config";
import { readWeekNotes, type ParsedDailyNote } from "./reader";
import { getWeekPath, getYearPath, getWeekIndex, getMonthLabel } from "./hierarchy";
import { weeklyRollupTemplate, monthlyRollupTemplate } from "./templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RollupItem {
  date: string;
  text: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Weekly rollup
// ---------------------------------------------------------------------------

/**
 * Write a weekly rollup summary note.
 * Reads all daily notes in the week directory and generates a summary.
 */
export async function writeWeeklyRollup(weekPath: string): Promise<string | null> {
  if (!shouldWriteToVault()) return null;

  try {
    const dailyNotes = await readWeekNotes(weekPath);

    // Collect unchecked reminders and completed items
    const thisWeekItems: string[] = [];
    const completedItems: string[] = [];
    const upcomingItems: string[] = [];

    for (const note of dailyNotes) {
      for (const r of note.reminders) {
        thisWeekItems.push(`- [ ] ${note.date}: ${r}`);
      }
      for (const c of note.completed) {
        completedItems.push(`- [x] ${note.date}: ${c}`);
      }
    }

    // Extract week label from path (e.g., "W19" from ".../W19")
    const weekDirName = path.basename(weekPath);
    const weekLabel = weekDirName.match(/^W\d{2}$/) ? weekDirName : getWeekIndex(new Date());

    // Extract month label from parent directory (e.g., "05-May")
    const monthDirName = path.basename(path.dirname(weekPath));
    const monthLabel = monthDirName.match(/^\d{2}-/) ? monthDirName : "Unknown";

    const year = new Date().getFullYear();

    const content = weeklyRollupTemplate(
      weekLabel,
      monthLabel,
      year,
      thisWeekItems.join("\n") || undefined,
      completedItems.join("\n") || undefined,
      upcomingItems.join("\n") || undefined,
    );

    const summaryPath = path.join(weekPath, `${weekLabel}-summary.md`);
    await fs.writeFile(summaryPath, content, "utf-8");
    console.log(`[obsidian] Weekly rollup written: ${summaryPath}`);
    return summaryPath;
  } catch (error) {
    console.error("[obsidian] Failed to write weekly rollup:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Monthly rollup
// ---------------------------------------------------------------------------

/**
 * Write a monthly rollup summary note.
 * Scans all weekly summary files in the month directory and aggregates them.
 */
export async function writeMonthlyRollup(monthPath: string): Promise<string | null> {
  if (!shouldWriteToVault()) return null;

  try {
    const files = await fs.readdir(monthPath);
    const summaryFiles = files.filter((f) => f.endsWith("-summary.md"));

    const allSummary: string[] = [];
    const allCompleted: string[] = [];
    const allUpcoming: string[] = [];

    for (const file of summaryFiles) {
      const filePath = path.join(monthPath, file);
      const content = await fs.readFile(filePath, "utf-8");

      // Simple section extraction
      const sections = extractSections(content);
      if (sections.thisWeek) allSummary.push(sections.thisWeek);
      if (sections.completed) allCompleted.push(sections.completed);
      if (sections.upcoming) allUpcoming.push(sections.upcoming);
    }

    // Extract month label from directory name (e.g., "05-May")
    const monthDirName = path.basename(monthPath);
    const monthLabel = monthDirName.match(/^\d{2}-/) ? monthDirName : "Unknown";
    const year = new Date().getFullYear();

    const content = monthlyRollupTemplate(
      monthLabel,
      year,
      allSummary.join("\n") || undefined,
      allCompleted.join("\n") || undefined,
      allUpcoming.join("\n") || undefined,
    );

    const summaryPath = path.join(monthPath, `${monthDirName}-summary.md`);
    await fs.writeFile(summaryPath, content, "utf-8");
    console.log(`[obsidian] Monthly rollup written: ${summaryPath}`);
    return summaryPath;
  } catch (error) {
    console.error("[obsidian] Failed to write monthly rollup:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auto-trigger after daily note write
// ---------------------------------------------------------------------------

/**
 * Called after writing a daily note. Triggers rollups as needed:
 * - Saturday (ISO week end) → weekly rollup
 * - Last day of month → monthly rollup
 * - Otherwise → updates weekly rollup if it exists
 */
export async function generateRollupAfterWrite(date: string): Promise<void> {
  if (!shouldWriteToVault()) return;

  try {
    const noteDate = new Date(date + "T00:00:00");
    const weekPath = getWeekPath(noteDate);

    // Check if this is the last day of the ISO week (Sunday = 0)
    const dayOfWeek = noteDate.getDay();
    const isEndOfWeek = dayOfWeek === 0; // Sunday

    // Check if this is the last day of the month
    const tomorrow = new Date(noteDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isEndOfMonth = tomorrow.getMonth() !== noteDate.getMonth();

    if (isEndOfWeek) {
      console.log(`[obsidian] End of week detected, generating weekly rollup for ${date}`);
      await writeWeeklyRollup(weekPath);
    }

    if (isEndOfMonth) {
      console.log(`[obsidian] End of month detected, generating monthly rollup`);
      // Month path is the parent of the week path
      const monthPath = path.dirname(weekPath);
      await writeMonthlyRollup(monthPath);
    }

    // Always try to update the weekly rollup
    const summaryPath = path.join(weekPath, `${getWeekIndex(noteDate)}-summary.md`);
    try {
      await fs.access(summaryPath);
      // Summary exists — update it
      await writeWeeklyRollup(weekPath);
    } catch {
      // No summary yet, that's fine
    }
  } catch (error) {
    console.error("[obsidian] Failed to generate rollup after write:", error);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSections(content: string): {
  thisWeek?: string;
  completed?: string;
  upcoming?: string;
  summary?: string;
} {
  const result: Record<string, string> = {};
  const lines = content.split("\n");
  let currentSection = "";
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)/);
    if (headingMatch) {
      if (currentSection && sectionLines.length > 0) {
        result[currentSection] = sectionLines.join("\n");
      }
      currentSection = headingMatch[1].toLowerCase().replace(/\s+/g, "");
      sectionLines.length = 0;
    } else if (currentSection && line.trim()) {
      sectionLines.push(line);
    }
  }

  if (currentSection && sectionLines.length > 0) {
    result[currentSection] = sectionLines.join("\n");
  }

  return {
    thisWeek: result["thisweek"],
    completed: result["completed"],
    upcoming: result["upcoming"],
    summary: result["summary"],
  };
}
