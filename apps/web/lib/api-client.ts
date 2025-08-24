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
  
  if (!contentType?.includes('application/json')) {
    throw new ApiError('Invalid response format', response.status);
  }

  const data: ApiResponse<T> = await response.json();
  
  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || 'An unexpected error occurred',
      response.status,
      data.error?.code
    );
  }

  return data.data as T;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<T>(response);
}

export { ApiError };
