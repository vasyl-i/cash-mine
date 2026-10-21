import { QueryClient } from '@tanstack/react-query';

import { ApiError, isRetryableError } from '@/api/client';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Reads retry only transient failures (network, 429, 5xx), honouring Retry-After.
        retry: (failureCount, error) => failureCount < 3 && isRetryableError(error),
        retryDelay: (attempt, error) =>
          error instanceof ApiError && error.retryAfterMs !== undefined
            ? error.retryAfterMs
            : Math.min(1000 * 2 ** attempt, 8000),
        staleTime: 15_000,
        refetchOnWindowFocus: true,
      },
      // Mutations that move money must never be retried blindly.
      mutations: { retry: 0 },
    },
  });
