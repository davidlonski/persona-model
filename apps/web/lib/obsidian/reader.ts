import fs from "fs/promises";
import path from "path";
import { config, shouldWriteToVault } from "../config";
import { getNotePath } from "./writer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedDailyNote {
  date: string;
  frontmatter: Record<string, string | string[]>;
  reminders: string[];       // unchecked items (- [ ] ...)
  completed: string[];       // checked items (- [x] ...)
  notes: string[];           // lines under ## Notes
  raw: string;               // full file content
}

// ---------------------------------------------------------------------------
// Reader functions
// ---------------------------------------------------------------------------

/**
 * Reads the note at getNotePath(date)
 * Parses YAML frontmatter (simple regex-based, no yaml library needed)
 * Extracts unchecked items under `## Reminders` (lines matching `- [ ]`)
 * Extracts checked items under `## Completed` (lines matching `- [x]`)
 * Extracts lines under `## Notes`
 * Returns null if file doesn't exist
 */
export async function readDailyNote(date: string): Promise<ParsedDailyNote | null> {
  if (!shouldWriteToVault()) {
    return null;
  }

  const filePath = getNotePath(date);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter: Record<string, string | string[]> = {};
    
    if (frontmatterMatch) {
      const frontmatterText = frontmatterMatch[1];
      const lines = frontmatterText.split('\n');
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(': ');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(': ').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|['"]$/g, '');
          // Check if it's an array (comma-separated values in brackets)
          if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
            const arrayValue = cleanValue.slice(1, -1)
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
            frontmatter[key] = arrayValue;
          } else {
            frontmatter[key] = cleanValue;
          }
        }
      }
    }
    
    // Extract sections
    const reminders: string[] = [];
    const completed: string[] = [];
    const notes: string[] = [];
    
    // Split content into lines for processing
    const lines = content.split('\n');
    let currentSection: null | 'reminders' | 'completed' | 'notes' = null;
    
    for (const line of lines) {
      // Check for section headers
      if (line.trim() === '## Reminders') {
        currentSection = 'reminders';
        continue;
      } else if (line.trim() === '## Completed') {
        currentSection = 'completed';
        continue;
      } else if (line.trim() === '## Notes') {
        currentSection = 'notes';
        continue;
      } else if (line.startsWith('## ')) {
        // Other section header, reset current section
        currentSection = null;
        continue;
      }
      
      // Process content based on current section
      if (currentSection === 'reminders' && line.trim().startsWith('- [ ]')) {
        // Remove the '- [ ]' prefix and any extra whitespace
        const item = line.trim().slice(5).trim();
        if (item) reminders.push(item);
      } else if (currentSection === 'completed' && line.trim().startsWith('- [x]')) {
        // Remove the '- [x]' prefix and any extra whitespace
        const item = line.trim().slice(5).trim();
        if (item) completed.push(item);
      } else if (currentSection === 'notes' && line.trim() && !line.startsWith('##')) {
        // Add non-empty lines that aren't section headers
        notes.push(line);
      }
    }
    
    return {
      date,
      frontmatter,
      reminders,
      completed,
      notes,
      raw: content
    };
  } catch (error) {
    // File doesn't exist or other error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`[obsidian] Failed to read daily note ${date}:`, error);
    return null;
  }
}

/**
 * Reads all `.md` files in a week directory (non-recursively)
 * Parses each as a daily note
 * Returns array sorted by date
 */
export async function readWeekNotes(weekPath: string): Promise<ParsedDailyNote[]> {
  if (!shouldWriteToVault()) {
    return [];
  }
  
  try {
    const files = await fs.readdir(weekPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    const notes: ParsedDailyNote[] = [];
    
    for (const file of markdownFiles) {
      // Extract date from filename (assuming YYYY-MM-DD.md format)
      const dateStr = file.slice(0, -3); // Remove .md extension
      const note = await readDailyNote(dateStr);
      if (note) {
        notes.push(note);
      }
    }
    
    // Sort by date
    return notes.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`[obsidian] Failed to read week notes from ${weekPath}:`, error);
    return [];
  }
}

/**
 * Reads daily notes for today + N days forward
 * Uses getNotePath for each date
 * Returns only notes that exist (skips missing dates)
 */
export async function readUpcoming(days: number = 7): Promise<ParsedDailyNote[]> {
  if (!shouldWriteToVault()) {
    return [];
  }
  
  const notes: ParsedDailyNote[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD format
    
    const note = await readDailyNote(dateStr);
    if (note) {
      notes.push(note);
    }
  }
  
  return notes;
}

/**
 * Simple text search across all PersonaModel notes
 * Walks `config.personaModelPath` recursively
 * Returns notes where the file content contains the query string (case-insensitive)
 * Limits to 20 results
 */
export async function searchVault(query: string): Promise<ParsedDailyNote[]> {
  if (!shouldWriteToVault()) {
    return [];
  }
  
  const results: ParsedDailyNote[] = [];
  const queryLower = query.toLowerCase();
  
  try {
    await searchDirectory(config.personaModelPath, queryLower, results);
    return results.slice(0, 20); // Limit to 20 results
  } catch (error) {
    console.error(`[obsidian] Failed to search vault for "${query}":`, error);
    return [];
  }
}

/**
 * Recursively search directory for markdown files containing query
 */
async function searchDirectory(
  dirPath: string,
  queryLower: string,
  results: ParsedDailyNote[]
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await searchDirectory(fullPath, queryLower, results);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Extract date from filename
        const dateStr = entry.name.slice(0, -3); // Remove .md extension
        const note = await readDailyNote(dateStr);
        if (note && note.raw.toLowerCase().includes(queryLower)) {
          results.push(note);
        }
      }
    }
  } catch (error) {
    console.error(`[obsidian] Error searching directory ${dirPath}:`, error);
  }
}

/**
 * Scans vault for any note containing `[[YYYY-MM-DD]]` where YYYY-MM-DD = date
 * Returns array of file paths that reference this date
 */
export async function getBacklinks(date: string): Promise<string[]> {
  if (!shouldWriteToVault()) {
    return [];
  }
  
  const dateLink = `[[$date]]`;
  const backlinks: string[] = [];
  
  try {
    await scanForLinks(config.personaModelPath, dateLink, backlinks);
    return backlinks;
  } catch (error) {
    console.error(`[obsidian] Failed to get backlinks for ${date}:`, error);
    return [];
  }
}

/**
 * Recursively scan directory for files containing the date link
 */
async function scanForLinks(
  dirPath: string,
  dateLink: string,
  backlinks: string[]
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await scanForLinks(fullPath, dateLink, backlinks);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          if (content.includes(dateLink)) {
            backlinks.push(fullPath);
          }
        } catch (error) {
          console.error(`[obsidian] Error reading file ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`[obsidian] Error scanning directory ${dirPath}:`, error);
  }
}

// Re-export getNotePath for external consumers
export { getNotePath } from "./writer";