import { config, shouldWriteToVault } from '../config';
import { extractEntities } from './linker';
import { promises as fs } from 'fs';
import path from 'path';

export async function ensureEntityPage(
  name: string, 
  type: "person" | "concept", 
  firstMention: string, 
date: string
): Promise<string | null> {
  // Check if vault writes are enabled
  if (!shouldWriteToVault() || !config.vaultPath) {
    return null;
  }

  // Determine the directory and file path based on type
  const entityDir = type === "person" ? "People" : "Concepts";
  const fileName = `${name}.md`;
  const filePath = path.join(config.vaultPath, entityDir, fileName);

  try {
    // Check if the file already exists
    try {
      await fs.access(filePath);
      // File exists, return null
      return null;
    } catch (err: unknown) {
      // File doesn't exist, we'll create it
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Create the stub page content
    const content = `---
type: ${type}
source: personamodel
first_seen: "${date}"
---

# ${name}

## Mentions
- ${date}: ${firstMention}
`;

    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    
    return filePath;
  } catch (error) {
    console.error(`Failed to ensure entity page for ${name}:`, error);
    return null;
  }
}

export async function appendMention(
  name: string, 
  type: "person" | "concept", 
  date: string, 
  context: string
): Promise<void> {
  // Check if vault writes are enabled
  if (!shouldWriteToVault() || !config.vaultPath) {
    return;
  }

  // Determine the directory and file path based on type
  const entityDir = type === "person" ? "People" : "Concepts";
  const fileName = `${name}.md`;
  const filePath = path.join(config.vaultPath, entityDir, fileName);

  try {
    // Check if the file exists
    let exists = false;
    try {
      await fs.access(filePath);
      exists = true;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
      // File doesn't exist, we'll create it via ensureEntityPage
    }

    if (!exists) {
      // Create the page with this mention as the first mention
      await ensureEntityPage(name, type, context, date);
      return;
    }

    // File exists, append the mention
    const newMention = `- ${date}: ${context}\n`;
    await fs.appendFile(filePath, newMention, 'utf8');
  } catch (error) {
    console.error(`Failed to append mention for ${name}:`, error);
    // Don't throw - we want this to be non-blocking
  }
}

export async function ensureEntitiesFromReminders(
  reminders: Array<{who: string; what: string; when: string; date: string}>
): Promise<void> {
  // Process each reminder
  for (const reminder of reminders) {
    try {
      // Ensure person entity page for "who"
      if (reminder.who?.trim()) {
        await ensureEntityPage(
          reminder.who.trim(),
          "person",
          `- [ ] ${reminder.who} | ${reminder.what} | ${reminder.when}`,
          reminder.date
        ).catch(err => {
          console.error(`Failed to ensure person entity page for ${reminder.who}:`, err);
        });
      }

      // Extract concepts from "what" and ensure entity pages for them
      const entities = extractEntities(reminder.who, reminder.what, reminder.when);
      const conceptEntities = entities.filter(e => e.type === "concept");
      
      for (const concept of conceptEntities) {
        await ensureEntityPage(
          concept.name,
          "concept",
          `- [ ] ${reminder.who} | ${reminder.what} | ${reminder.when}`,
          reminder.date
        ).catch(err => {
          console.error(`Failed to ensure concept entity page for ${concept.name}:`, err);
        });
      }
    } catch (error) {
      console.error(`Failed to process reminder for entity creation:`, error);
      // Continue processing other reminders
    }
  }
}