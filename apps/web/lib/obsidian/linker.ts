export interface Entity {
  name: string;
  type: "person" | "concept" | "date";
}

export function linkify(text: string, entities: Entity[]): string {
  if (!text || !entities.length) return text;

  // Sort entities by name length descending to replace longest matches first
  const sortedEntities = [...entities].sort((a, b) => b.name.length - a.name.length);

  // Process each entity
  let result = text;
  for (const entity of sortedEntities) {
    // Skip if already linked
    const linkPattern = new RegExp(`\\[\\[${escapeRegExp(entity.name)}\\]\\]`, 'g');
    if (linkPattern.test(result)) continue;

    // Build the replacement — always [[entity.name]]
    // For date entities, the name should already be in YYYY-MM-DD format
    const replacement = `[[${entity.name}]]`;

    // Replace whole words only (not substrings)
    const wordBoundaryPattern = new RegExp(`\\b${escapeRegExp(entity.name)}\\b`, 'g');
    result = result.replace(wordBoundaryPattern, replacement);
  }

  return result;
}

export function extractEntities(who: string, what: string, whenText: string): Entity[] {
  const entities: Entity[] = [];
  
  // Add person entity from "who" field
  if (who?.trim()) {
    entities.push({
      name: who.trim(),
      type: "person"
    });
  }

  // Known concept list
  const knownConcepts = [
    "birthday", "dentist", "appointment", "meeting", "deadline", 
    "garbage", "holiday", "anniversary", "interview", "flight", 
    "reservation", "payment", "bill", "rent"
  ];

  // Extract concepts from "what" field
  if (what?.trim()) {
    const lowerWhat = what.toLowerCase().trim();
    for (const concept of knownConcepts) {
      const wordBoundaryPattern = new RegExp(`\\b${escapeRegExp(concept)}\\b`, 'i');
      if (wordBoundaryPattern.test(lowerWhat)) {
        entities.push({
          name: concept,
          type: "concept"
        });
      }
    }
  }

  // Check if whenText contains a date reference
  if (whenText?.trim()) {
    const datePatterns = [
      /\b\d{4}-\d{1,2}-\d{1,2}\b/, // YYYY-MM-DD
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // MM/DD/YYYY
      /\b(today|tomorrow|yesterday)\b/i,
      /\b(next|last)\s+(week|month|year)\b/i,
    ];

    const hasDate = datePatterns.some(pattern => pattern.test(whenText));
    if (hasDate) {
      entities.push({
        name: whenText.trim(),
        type: "date"
      });
    }
  }

  return entities;
}

export function linkifyReminder(who: string, what: string, when: string): string {
  const entities = extractEntities(who, what, when);
  const linkedText = linkify(`- [ ] ${who} | ${what} | ${when}`, entities);
  return linkedText;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
