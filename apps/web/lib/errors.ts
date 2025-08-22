// apps/web/lib/errors.ts

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  code: string;
  meta: Record<string, any>;
  httpStatus?: number;

  constructor(code: string, message: string, meta: Record<string, any> = {}, httpStatus?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    this.httpStatus = httpStatus;
  }
}

/**
 * Error types for LLM JSON parsing failures
 */
export type LlmJsonErrorCode = 
  | 'OPENAI_API_ERROR'
  | 'ANTHROPIC_API_ERROR'
  | 'GEMINI_API_ERROR'
  | 'LLM_JSON_PARSE_FAILED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'UNSUPPORTED_PROVIDER'
  | 'LLM_API_ERROR'
  | 'NON_JSON_RESPONSE'
  | 'RETRY_FAILED';

/**
 * Error class for LLM JSON parsing failures
 */
export class LlmJsonError extends AppError {
  constructor(code: LlmJsonErrorCode, meta: Record<string, any> = {}) {
    super(
      code, 
      `LLM JSON Error: ${code}`, 
      meta, 
      code === 'LLM_JSON_PARSE_FAILED' || code === 'SCHEMA_VALIDATION_FAILED' ? 422 : 502
    );
    this.name = 'LlmJsonError';
  }
}

/**
 * Error types for profile extraction failures
 */
export type ProfileExtractionErrorCode = 
  | 'UNREADABLE_RESUME'
  | 'PROFILE_EXTRACTION_FAILED'
  | 'POLISH_JSON_PARSE_FAILED'
  | 'INVALID_PROFILE_FORMAT';

/**
 * Error class for profile extraction failures
 */
export class ProfileExtractionError extends AppError {
  constructor(code: ProfileExtractionErrorCode, meta: Record<string, any> = {}) {
    super(
      code, 
      `Profile extraction error: ${code}`, 
      meta, 
      code === 'UNREADABLE_RESUME' ? 415 : 400
    );
    this.name = 'ProfileExtractionError';
  }
}

/**
 * Error types for resume tailoring failures
 */
export type TailorResumeErrorCode = 
  | 'TAILOR_JSON_PARSE_FAILED'
  | 'TAILOR_SCHEMA_VALIDATION_FAILED'
  | 'TAILOR_FAILED'
  | 'TAILOR_UNKNOWN_ERROR';

/**
 * Error class for resume tailoring failures
 */
export class TailorResumeError extends AppError {
  constructor(code: TailorResumeErrorCode, meta: Record<string, any> = {}) {
    super(
      code, 
      `Resume tailoring error: ${code}`, 
      meta, 
      422
    );
    this.name = 'TailorResumeError';
  }
}

/**
 * Error types for document generation failures
 */
export type DocumentGenerationErrorCode = 
  | 'PDF_GENERATION_FAILED'
  | 'DOCX_GENERATION_FAILED'
  | 'FILE_WRITE_ERROR'
  | 'FILE_READ_ERROR';

/**
 * Error class for document generation failures
 */
export class DocumentGenerationError extends AppError {
  constructor(code: DocumentGenerationErrorCode, meta: Record<string, any> = {}) {
    super(
      code, 
      `Document generation error: ${code}`, 
      meta, 
      500
    );
    this.name = 'DocumentGenerationError';
  }
}

/**
 * Maps an error to a standard API response format
 * @param error Error object
 * @param traceId Optional trace ID for tracking
 * @returns Standardized error response
 */
export function mapErrorToApiResponse(error: unknown, traceId?: string) {
  if (error instanceof AppError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      ...(error.meta.hint && { hint: error.meta.hint }),
      ...(error.meta.provider && { provider: error.meta.provider }),
      ...(error.meta.model && { model: error.meta.model }),
      ...(error.meta.preview && { rawPreview: error.meta.preview }),
      ...(error.meta.developerHint && { developerHint: error.meta.developerHint }),
      ...(traceId && { traceId }),
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      ok: false,
      code: 'UNKNOWN_ERROR',
      message: error.message,
      ...(traceId && { traceId }),
    };
  }

  // Handle unknown errors
  return {
    ok: false,
    code: 'UNKNOWN_ERROR',
    message: String(error),
    ...(traceId && { traceId }),
  };
}
