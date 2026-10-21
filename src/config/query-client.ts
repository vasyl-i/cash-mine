import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
      // Mutations that move money must never be retried blindly.
      mutations: { retry: 0 },
    },
  });
