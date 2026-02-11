/**
 * Retry handler with exponential backoff and throttling support
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBase: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, and 429 (throttling)
    if (error?.statusCode) {
      const code = error.statusCode;
      return code === 429 || (code >= 500 && code < 600);
    }
    return true; // Retry on unknown errors
  }
};

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxRetries - 1 || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Handle throttling (429) with Retry-After header
      if (error?.statusCode === 429) {
        const retryAfter = getRetryAfter(error);
        console.log(`Throttled (429). Waiting ${retryAfter}ms before retry...`);
        await sleep(retryAfter);
        continue;
      }

      // Exponential backoff
      const delay = calculateBackoff(attempt, opts);
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.exponentialBase, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Get retry delay from Retry-After header
 */
function getRetryAfter(error: any): number {
  const retryAfter = error?.headers?.['Retry-After'] || error?.headers?.['retry-after'];

  if (!retryAfter) {
    return 5000; // Default 5 seconds
  }

  // If it's a number, it's in seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // If it's a date string, calculate difference
  try {
    const retryDate = new Date(retryAfter);
    const now = new Date();
    const diff = retryDate.getTime() - now.getTime();
    return Math.max(diff, 1000); // At least 1 second
  } catch {
    return 5000; // Default 5 seconds
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch operations with rate limiting
 */
export async function withRateLimit<T>(
  operations: Array<() => Promise<T>>,
  rateLimit: number = 5, // Max concurrent operations
  delayBetweenBatches: number = 1000 // Delay between batches in ms
): Promise<T[]> {
  const results: T[] = [];
  const batches: Array<Array<() => Promise<T>>> = [];

  // Split operations into batches
  for (let i = 0; i < operations.length; i += rateLimit) {
    batches.push(operations.slice(i, i + rateLimit));
  }

  // Execute batches sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);

    // Delay between batches (except for the last one)
    if (i < batches.length - 1) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
