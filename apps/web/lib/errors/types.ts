export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'PROVIDER_ERROR'
  | 'PDF_ERROR'
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  requestId: string;
  timestamp: string;
  details?: {
    provider?: string;
    model?: string;
    attempts?: Array<{
      provider: string;
      error: string;
      status?: number;
    }>;
    validation?: Array<{
      field: string;
      message: string;
    }>;
    raw?: any;
    debug?: {
      env: string;
      dbEnabled: boolean;
      nodeVersion: string;
      stack?: string;
    };
  };
}
