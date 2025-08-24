import { createLogger } from '@/lib/logger';
import type { ApiResponse } from './errorHandler';

const logger = createLogger('api-client');

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    logger.error('Non-JSON response from API', {
      status: response.status,
      contentType,
      bodyPreview: text.slice(0, 500)
    });
    throw new ApiError(
      'INVALID_RESPONSE',
      'Server returned non-JSON response',
      response.status,
      { contentType, bodyPreview: text.slice(0, 200) }
    );
  }

  const data: ApiResponse = await response.json();
  
  if (!response.ok || !data.ok) {
    const error = data.error || {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown API error'
    };
    throw new ApiError(
      error.code,
      error.message,
      response.status,
      error.details
    );
  }

  return data.data;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('API request failed', {
      path,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new ApiError(
      'REQUEST_FAILED',
      'Failed to make API request',
      0,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

export async function uploadFile(
  path: string,
  file: File,
  data: Record<string, any> = {}
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  // Append other data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  try {
    const response = await fetch(path, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    return handleResponse(response);
  } catch (error) {
    logger.error('File upload failed', {
      path,
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new ApiError(
      'UPLOAD_FAILED',
      'Failed to upload file',
      0,
      { fileName: file.name }
    );
  }
}
