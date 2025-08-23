import { createDevLogger } from './devLogger';

const logger = createDevLogger('safe-json');

/**
 * Safely parse JSON with error handling
 * @param text The JSON string to parse
 * @param fallback Optional fallback value if parsing fails
 * @returns The parsed JSON or fallback value
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    logger.error('Failed to parse JSON', { 
      error: error instanceof Error ? error.message : String(error),
      textPreview: text.slice(0, 100) + (text.length > 100 ? '...' : '')
    });
    return fallback;
  }
}

/**
 * Safely stringify an object to JSON with error handling
 * @param value The value to stringify
 * @param fallback Optional fallback string if stringification fails
 * @returns The JSON string or fallback value
 */
export function safeJsonStringify(value: unknown, fallback: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.error('Failed to stringify to JSON', { 
      error: error instanceof Error ? error.message : String(error),
      valueType: typeof value,
      isArray: Array.isArray(value)
    });
    return fallback;
  }
}

/**
 * Check if a string is valid JSON
 * @param text The string to check
 * @returns Whether the string is valid JSON
 */
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize an object to ensure it can be safely serialized to JSON
 * @param obj The object to sanitize
 * @returns A sanitized version of the object
 */
export function sanitizeForJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJson(item));
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined values
      continue;
    }
    
    if (value === null) {
      result[key] = null;
      continue;
    }
    
    if (typeof value === 'function') {
      // Skip functions
      continue;
    }
    
    if (typeof value === 'object') {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (value instanceof Error) {
        result[key] = {
          message: value.message,
          stack: value.stack
        };
      } else if (value instanceof RegExp) {
        result[key] = value.toString();
      } else if (value instanceof Map) {
        result[key] = Object.fromEntries(value);
      } else if (value instanceof Set) {
        result[key] = Array.from(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => sanitizeForJson(item));
      } else if (typeof value.toJSON === 'function') {
        result[key] = value.toJSON();
      } else {
        result[key] = sanitizeForJson(value);
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
