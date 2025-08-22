// apps/web/lib/llm/json-utils.ts
import { jsonrepair } from "jsonrepair";
import { LlmJsonError } from "@/lib/errors";
import { createDevLogger } from "@/lib/utils/devLogger";

const logger = createDevLogger("llm:json-utils");

/**
 * Parses and validates JSON response from LLM
 * Uses multiple fallback strategies to handle malformed JSON
 * @param text Raw text from LLM
 * @param provider Provider name
 * @param model Model name
 * @returns Parsed JSON object
 * @throws LlmJsonError if JSON parsing fails
 */
export function parseJsonResponse(text: string, provider: string, model: string): any {
  // Clean up the text before parsing
  let cleanedText = text.trim();
  let originalLength = cleanedText.length;
  let sanitizationApplied = false;
  
  // Remove markdown code fences if present
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const jsonBlockMatch = cleanedText.match(jsonBlockRegex);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    cleanedText = jsonBlockMatch[1].trim();
    sanitizationApplied = true;
    logger.jsonSanitization(
      provider, 
      model, 
      originalLength, 
      cleanedText.length, 
      "Removed markdown code fences"
    );
  }
  
  // Remove any text before the first { or after the last }
  const firstBrace = cleanedText.indexOf('{');
  const lastBrace = cleanedText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    const potentialJson = cleanedText.substring(firstBrace, lastBrace + 1);
    if (potentialJson.length > 10) { // Ensure it's not just a small fragment
      cleanedText = potentialJson;
      sanitizationApplied = true;
      logger.jsonSanitization(
        provider, 
        model, 
        originalLength, 
        cleanedText.length, 
        "Extracted JSON object"
      );
    }
  }

  // Attempt direct parsing
  try {
    const result = JSON.parse(cleanedText);
    logger.info(`Successfully parsed JSON from ${provider}/${model}${sanitizationApplied ? ' after sanitization' : ''}`);
    return result;
  } catch (error) {
    logger.warn(`Failed to parse JSON directly from ${provider}/${model}`, { error });
    
    // Attempt repair with jsonrepair
    try {
      const repaired = jsonrepair(cleanedText);
      logger.jsonSanitization(
        provider, 
        model, 
        cleanedText.length, 
        repaired.length, 
        "Repaired JSON"
      );
      return JSON.parse(repaired);
    } catch (repairError) {
      logger.warn(`Failed to repair JSON from ${provider}/${model}`, { error: repairError });
      
      // Try extracting JSON with a more aggressive approach
      try {
        // Look for patterns that might indicate JSON structure
        const jsonPattern = /{[\s\S]*}/;
        const match = cleanedText.match(jsonPattern);
        
        if (match && match[0]) {
          const extractedJson = match[0];
          const repairedJson = jsonrepair(extractedJson);
          logger.jsonSanitization(
            provider, 
            model, 
            cleanedText.length, 
            repairedJson.length, 
            "Extracted and repaired JSON with pattern matching"
          );
          return JSON.parse(repairedJson);
        }
      } catch (extractError) {
        logger.error(`Failed to extract JSON with pattern matching from ${provider}/${model}`, { error: extractError });
      }
      
      // Log the issue in development
      logger.error(`All JSON parsing attempts failed for ${provider}/${model}`, { 
        preview: cleanedText.slice(0, 800),
        fullText: process.env.NODE_ENV === "development" ? cleanedText : undefined
      });
      
      throw new LlmJsonError("LLM_JSON_PARSE_FAILED", {
        provider,
        model,
        preview: cleanedText.slice(0, 800)
      });
    }
  }
}
