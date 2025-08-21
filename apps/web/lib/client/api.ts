/**
 * Client-side API utilities for making requests to server endpoints
 */

/**
 * Make a POST request with JSON body
 */
export async function postJSON<T>(url: string, body: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Try to parse error response
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error.message || errorMessage;
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Make a POST request with FormData
 */
export async function postFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // Try to parse error response
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : errorData.error.message || errorMessage;
        }
      } else {
        const text = await response.text();
        if (text) errorMessage += ` - ${text.substring(0, 100)}`;
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('API returned non-JSON response');
  }

  return response.json();
}

/**
 * Try multiple API endpoints with the same request
 * Useful for handling fallbacks between different API routes
 */
export async function tryMultipleEndpoints<T>(
  endpoints: string[], 
  makeRequest: (endpoint: string) => Promise<T>
): Promise<T> {
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      return await makeRequest(endpoint);
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error);
      lastError = error as Error;
      // Continue to next endpoint
    }
  }

  // If we get here, all endpoints failed
  throw lastError || new Error('All API endpoints failed');
}

/**
 * Generate a resume kit using the resume generation API
 */
export async function generateResumeKit(formData: FormData) {
  return tryMultipleEndpoints(
    ['/api/resume/generate', '/api/generate', '/api/resume-generate'],
    (endpoint) => postFormData(endpoint, formData)
  );
}
