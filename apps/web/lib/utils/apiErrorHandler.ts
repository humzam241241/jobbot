import { createDevLogger } from './devLogger';

const logger = createDevLogger('api-error-handler');

/**
 * Custom API error with additional properties
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;
  
  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Parse API response errors and convert to a standard format
 * @param response The fetch response object
 * @returns Promise resolving to the error object
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  // Try to get the content type
  const contentType = response.headers.get('content-type') || '';
  
  try {
    if (contentType.includes('application/json')) {
      // Parse JSON error
      const data = await response.json();
      return new ApiError(
        data.error?.message || data.message || 'Unknown error',
        response.status,
        data.error?.code || data.code || 'API_ERROR',
        data.error?.details || data.details
      );
    } else if (contentType.includes('text/html')) {
      // Handle HTML error (likely a 500 error page)
      const html = await response.text();
      
      // Try to extract error message from HTML
      let errorMessage = 'Server returned HTML instead of JSON';
      
      // Extract title if possible
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        errorMessage = `Server error: ${titleMatch[1]}`;
      }
      
      // Log the HTML for debugging
      logger.error('Server returned HTML instead of JSON', {
        status: response.status,
        url: response.url,
        htmlPreview: html.substring(0, 500) + (html.length > 500 ? '...' : '')
      });
      
      return new ApiError(
        errorMessage,
        response.status,
        'HTML_RESPONSE',
        { htmlPreview: html.substring(0, 200) + '...' }
      );
    } else {
      // Handle other content types
      const text = await response.text();
      
      logger.error('Server returned non-JSON response', {
        status: response.status,
        contentType,
        url: response.url,
        textPreview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
      });
      
      return new ApiError(
        `Server returned ${contentType || 'unknown'} content instead of JSON`,
        response.status,
        'INVALID_CONTENT_TYPE',
        { contentType, textPreview: text.substring(0, 200) + '...' }
      );
    }
  } catch (error) {
    logger.error('Error parsing API error response', {
      status: response.status,
      url: response.url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return new ApiError(
      `Failed to parse error response: ${error instanceof Error ? error.message : String(error)}`,
      response.status,
      'PARSE_ERROR'
    );
  }
}

/**
 * Safely fetch JSON from an API with enhanced error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Promise resolving to the parsed JSON data
 * @throws ApiError if the request fails
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': options?.body ? 'application/json' : undefined,
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      throw await parseApiError(response);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.error('Response is not JSON', {
        contentType,
        url,
        textPreview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
      });
      
      throw new ApiError(
        'Server did not return JSON',
        response.status,
        'INVALID_CONTENT_TYPE',
        { contentType, textPreview: text.substring(0, 200) + '...' }
      );
    }
    
    try {
      return await response.json();
    } catch (error) {
      logger.error('Error parsing JSON response', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new ApiError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
        response.status,
        'JSON_PARSE_ERROR'
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    logger.error('Fetch error', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new ApiError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Safely post form data to an API with enhanced error handling
 * @param url The URL to post to
 * @param formData The form data to post
 * @returns Promise resolving to the parsed JSON data
 * @throws ApiError if the request fails
 */
export async function safePostForm<T = any>(
  url: string,
  formData: FormData,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      throw await parseApiError(response);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.error('Response is not JSON', {
        contentType,
        url,
        textPreview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
      });
      
      throw new ApiError(
        'Server did not return JSON',
        response.status,
        'INVALID_CONTENT_TYPE',
        { contentType, textPreview: text.substring(0, 200) + '...' }
      );
    }
    
    try {
      return await response.json();
    } catch (error) {
      logger.error('Error parsing JSON response', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new ApiError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
        response.status,
        'JSON_PARSE_ERROR'
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    logger.error('Fetch error', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new ApiError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
      0,
      'NETWORK_ERROR'
    );
  }
}
