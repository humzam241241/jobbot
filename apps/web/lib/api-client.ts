import { ApiResponse } from '@/types';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    throw new ApiError(`Invalid response format: Expected JSON but got ${contentType || 'unknown'}`, response.status);
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch (error) {
    throw new ApiError(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`, response.status);
  }
  
  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || `Error: ${response.status} ${response.statusText || 'Unknown error'}`,
      response.status,
      data.error?.code
    );
  }

  if (data.data === undefined) {
    throw new ApiError('Invalid response format: Missing data property', response.status);
  }

  return data.data as T;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body: formData,
  });
  return handleResponse<T>(response);
}

export { ApiError };