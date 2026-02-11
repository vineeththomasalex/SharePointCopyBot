/**
 * Error handling utilities
 */

export interface AppError {
  message: string;
  code: string;
  details?: any;
  statusCode?: number;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: any): AppError {
  // Handle MSAL errors
  if (error?.errorCode) {
    return {
      message: error.errorMessage || error.message || 'Authentication error',
      code: error.errorCode,
      details: error
    };
  }

  // Handle Graph API errors
  if (error?.statusCode) {
    return {
      message: getUserFriendlyMessage(error.statusCode, error.message),
      code: `HTTP_${error.statusCode}`,
      statusCode: error.statusCode,
      details: error
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      details: error
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'UNKNOWN_ERROR'
    };
  }

  // Unknown error type
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: error
  };
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(statusCode: number, originalMessage?: string): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your configuration.';
    case 401:
      return 'Authentication required. Please login again.';
    case 403:
      return 'Access denied. You don\'t have permission to perform this operation.';
    case 404:
      return 'Resource not found. The file, folder, or library may have been deleted.';
    case 409:
      return 'Conflict. The resource already exists or has been modified.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return originalMessage || `Request failed with status ${statusCode}`;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const statusCode = error?.statusCode;

  if (!statusCode) {
    return true; // Retry network errors
  }

  // Retry on throttling and server errors
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  const statusCode = error?.statusCode;
  const errorCode = error?.errorCode;

  return (
    statusCode === 401 ||
    statusCode === 403 ||
    errorCode === 'consent_required' ||
    errorCode === 'interaction_required' ||
    errorCode === 'login_required'
  );
}

/**
 * Check if error is permission related
 */
export function isPermissionError(error: any): boolean {
  const statusCode = error?.statusCode;
  return statusCode === 403;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: any): string {
  const appError = toAppError(error);
  return `[${appError.code}] ${appError.message}`;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: any): string {
  const appError = toAppError(error);
  return appError.message;
}

/**
 * Log error with context
 */
export function logError(context: string, error: any): void {
  const appError = toAppError(error);
  console.error(`[${context}] ${formatErrorForLogging(error)}`, appError.details);
}
