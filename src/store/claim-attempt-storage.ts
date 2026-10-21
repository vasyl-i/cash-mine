import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

// Durable storage for the in-flight claim attempt, independent of zustand `persist` (which writes
// fire-and-forget). Every write is awaited so the Idempotency-Key is on disk BEFORE the request is
// sent: if the app dies mid-request, a retry after restart reuses the same key.
const KEY = 'cashmine-claim-attempt';

const attemptSchema = z.object({
  idempotencyKey: z.string().min(1).max(100),
  body: z.object({ asset: z.string(), amount: z.string(), destinationId: z.string() }),
});

export type ClaimAttempt = z.infer<typeof attemptSchema>;

export const claimAttemptStorage = {
  save: async (attempt: ClaimAttempt): Promise<void> => {
    await AsyncStorage.setItem(KEY, JSON.stringify(attempt));
  },
  load: async (): Promise<ClaimAttempt | null> => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed = attemptSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  clear: async (): Promise<void> => {
    await AsyncStorage.removeItem(KEY);
  },
};
