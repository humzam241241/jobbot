import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createDevLogger } from './devLogger';

const logger = createDevLogger('parse-form');

export async function parseFormData<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
  options: {
    fileFields?: string[];
    jsonFields?: string[];
  } = {}
): Promise<{ data: T; files: Record<string, File>; } | { error: { code: string; message: string; } }> {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const data: Record<string, any> = {};
      const files: Record<string, File> = {};
      
      // Extract all fields
      for (const [key, value] of formData.entries()) {
        // Handle file fields
        if (options.fileFields?.includes(key) && value instanceof File) {
          files[key] = value;
          continue;
        }
        
        // Handle JSON fields
        if (options.jsonFields?.includes(key)) {
          try {
            data[key] = JSON.parse(String(value));
          } catch (e) {
            return {
              error: {
                code: 'INVALID_JSON',
                message: `Failed to parse JSON field: ${key}`,
              }
            };
          }
          continue;
        }
        
        // Handle regular fields
        data[key] = value;
      }
      
      // Validate against schema
      const result = schema.safeParse(data);
      if (!result.success) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: result.error.issues.map(i => i.message).join('; '),
          }
        };
      }
      
      return { data: result.data, files };
    }
    
    // Handle JSON
    const json = await req.json().catch(() => null);
    if (!json) {
      return {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON body',
        }
      };
    }
    
    // Validate JSON against schema
    const result = schema.safeParse(json);
    if (!result.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues.map(i => i.message).join('; '),
        }
      };
    }
    
    return { data: result.data, files: {} };
  } catch (e) {
    logger.error('Failed to parse request body', e);
    return {
      error: {
        code: 'PARSE_ERROR',
        message: 'Failed to parse request body',
      }
    };
  }
}
