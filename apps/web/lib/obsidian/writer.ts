import fs from "fs/promises";
import path from "path";
import { config, shouldWriteToVault } from "../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyNoteFrontmatter {
  date: string; // YYYY-MM-DD
  source: "personamodel";
  tags: string[];
  week: string; // WNN
  month: string; // MM-MMM
}

export interface AppendOptions {
  /** If true, prepend a timestamp to the appended content */
  timestamp?: boolean;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Returns the year/month/week/date path for a given date.
 * Structure: {personaModelPath}/YYYY/MM-MMM/WNN/YYYY-MM-DD.md
 *
 * For now the hierarchy is flat (YYYY/YYYY-MM-DD.md) —
 * the full hierarchy module (M7) will replace this.
 */
export function getNotePath(date: string): string {
  const year = date.slice(0, 4);
  return path.join(config.personaModelPath, year, `${date}.md`);
}

/**
 * Build YAML frontmatter string.
 */
function buildFrontmatter(fm: DailyNoteFrontmatter): string {
  const lines = [
    "---",
    `date: "${fm.date}"`,
    `source: ${fm.source}`,
    `tags: [${fm.tags.join(", ")}]`,
    `week: "${fm.week}"`,
    `month: "${fm.month}"`,
    "---",
    "",
  ];
  return lines.join("\n");
}

/**
 * Get ISO week number (W01–W53) for a date.
 */
function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Get month label like "05-May" from a date string.
 */
function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${mm}-${monthNames[d.getMonth()]}`;
}

/**
 * Get day-of-week name.
 */
function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

// ---------------------------------------------------------------------------
// Writer functions
// ---------------------------------------------------------------------------

/**
 * Write a new daily note to the Obsidian vault.
 * Creates directories recursively. Prepends YAML frontmatter.
 * If the file already exists it will be OVERWRITTEN — use appendToDailyNote
 * for incremental writes.
 */
export async function writeDailyNote(
  date: string,
  content: string,
  extraFrontmatter?: Partial<DailyNoteFrontmatter>
): Promise<string | null> {
  if (!shouldWriteToVault()) {
    console.log("[obsidian] Skipping vault write (runtimeEnv=vercel)");
    return null;
  }

  const filePath = getNotePath(date);
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });

    const frontmatter: DailyNoteFrontmatter = {
      date,
      source: "personamodel",
      tags: ["reminder", "daily"],
      week: getISOWeek(date),
      month: getMonthLabel(date),
      ...extraFrontmatter,
    };

    const fullContent =
      buildFrontmatter(frontmatter) +
      `# ${date} — ${getDayName(date)}\n\n` +
      content +
      "\n";

    await fs.writeFile(filePath, fullContent, "utf-8");
    console.log(`[obsidian] Wrote daily note: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`[obsidian] Failed to write daily note ${date}:`, error);
    return null;
  }
}

/**
 * Append content under a `## {section}` heading in an existing daily note.
 * If the note doesn't exist yet, creates it with frontmatter.
 * If the section already exists, appends below it.
 */
export async function appendToDailyNote(
  date: string,
  section: string,
  content: string,
  options: AppendOptions = {}
): Promise<string | null> {
  if (!shouldWriteToVault()) {
    console.log("[obsidian] Skipping vault write (runtimeEnv=vercel)");
    return null;
  }

  const filePath = getNotePath(date);
  const dir = path.dirname(filePath);

  try {
    let existing = "";

    try {
      existing = await fs.readFile(filePath, "utf-8");
    } catch {
      // File doesn't exist yet — create it fresh
      const sectionContent = `## ${section}\n\n${content}\n`;
      return writeDailyNote(date, sectionContent);
    }

    const sectionHeading = `## ${section}`;
    const timestampPrefix = options.timestamp
      ? `<!-- ${new Date().toISOString()} -->\n`
      : "";

    if (existing.includes(sectionHeading)) {
      // Append below the existing section
      const idx = existing.indexOf(sectionHeading);
      // Find the next ## heading after this section
      const afterSection = existing.indexOf("\n## ", idx + sectionHeading.length);
      const insertAt = afterSection === -1 ? existing.length : afterSection;

      const updated =
        existing.slice(0, insertAt).trimEnd() +
        "\n\n" +
        timestampPrefix +
        content +
        "\n" +
        (afterSection !== -1 ? existing.slice(afterSection) : "");

      await fs.writeFile(filePath, updated, "utf-8");
    } else {
      // Add new section at the end
      const updated =
        existing.trimEnd() +
        `\n\n${sectionHeading}\n\n` +
        timestampPrefix +
        content +
        "\n";

      await fs.writeFile(filePath, updated, "utf-8");
    }

    console.log(`[obsidian] Appended to daily note: ${filePath} [${section}]`);
    return filePath;
  } catch (error) {
    console.error(`[obsidian] Failed to append to daily note ${date}:`, error);
    return null;
  }
}

/**
 * Write a checklist of reminders to today's (or a specific date's) daily note.
 * Items follow the Who | What | When — relevance format from the diagram.
 */
export async function writeReminderChecklist(
  date: string,
  items: Array<{ who: string; what: string; when: string; relevance?: string }>
): Promise<string | null> {
  const lines = items.map((item) => {
    const relevance = item.relevance ? ` — ${item.relevance}` : "";
    return `- [ ] ${item.who} | ${item.what} | ${item.when}${relevance}`;
  });

  return appendToDailyNote(date, "Reminders", lines.join("\n"));
}

/**
 * Mark a reminder as completed in the vault (changes `- [ ]` to `- [x]`).
 * Matches by the checklist text content.
 */
export async function markReminderDone(
  date: string,
  searchText: string
): Promise<boolean> {
  if (!shouldWriteToVault()) return false;

  const filePath = getNotePath(date);

  try {
    let content = await fs.readFile(filePath, "utf-8");

    // Find the unchecked item matching searchText
    const regex = new RegExp(
      `(- )\\[ \\](${escapeRegex(searchText)})`,
      "g"
    );

    if (regex.test(content)) {
      content = content.replace(regex, "$1[x]$2");
      await fs.writeFile(filePath, content, "utf-8");
      console.log(`[obsidian] Marked done: "${searchText}" in ${date}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[obsidian] Failed to mark done in ${date}:`, error);
    return false;
  }
}

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
