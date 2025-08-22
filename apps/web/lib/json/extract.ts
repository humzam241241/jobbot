import { z } from "zod";

/**
 * Extracts the first JSON object from a text string
 * @param text Text that may contain JSON
 * @returns The extracted JSON object or null if none found
 */
export function extractJSONObject(text: string): any | null {
  const idx = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (idx >= 0 && last > idx) {
    const candidate = text.slice(idx, last + 1);
    try { 
      return JSON.parse(candidate); 
    } catch {
      // Try to find a valid JSON object within the text
      return findValidJsonObject(text);
    }
  }
  return null;
}

/**
 * Attempts to find a valid JSON object within text by scanning for matching braces
 * @param text Text to scan for JSON
 * @returns Parsed JSON object or null if none found
 */
function findValidJsonObject(text: string): any | null {
  let start = -1;
  let depth = 0;
  
  // Find potential JSON objects
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}') {
      depth--;
      
      // When we find a matching closing brace, try to parse
      if (depth === 0 && start !== -1) {
        const potentialJson = text.substring(start, i + 1);
        try {
          return JSON.parse(potentialJson);
        } catch {
          // Continue searching if this isn't valid JSON
        }
      }
    }
  }
  
  return null;
}

/**
 * Parses text with a Zod schema, handling extraction of JSON from text if needed
 * @param schema Zod schema to validate against
 * @param text Text that may contain JSON
 * @returns Result object with parsed data or error
 */
export function parseWithSchema<T>(schema: z.ZodType<T>, text: string) {
  // First try direct parsing
  const direct = (() => { 
    try { 
      return JSON.parse(text); 
    } catch { 
      return null; 
    }
  })();
  
  // If direct parsing fails, try to extract JSON
  const obj = direct ?? extractJSONObject(text);
  
  if (!obj) {
    return { 
      ok: false as const, 
      error: "Failed to extract valid JSON from the response.",
      rawText: text.slice(0, 500) // Include preview of raw text for debugging
    };
  }
  
  // Validate against schema
  const parsed = schema.safeParse(obj);
  
  if (!parsed.success) {
    return { 
      ok: false as const, 
      error: parsed.error.message,
      issues: parsed.error.issues,
      extractedJson: obj // Include the extracted JSON for debugging
    };
  }
  
  return { ok: true as const, data: parsed.data };
}
