import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CreateClaimBody } from '@/api/endpoints';
import type { Claim } from '@/api/schemas';
import { sameClaimBody, type TrackedClaim } from '@/utils/claims';

import { claimAttemptStorage, type ClaimAttempt } from './claim-attempt-storage';

export type { ClaimAttempt };

// An attempt = one logical claim. Its Idempotency-Key is reused for every retry of the same body
// (lost response, 5xx, 504, reload), so the server can never create a second claim.
type ClaimsState = {
  attempt: ClaimAttempt | null;
  attemptLoaded: boolean;
  claims: Record<string, TrackedClaim>;
  /**
   * Returns the attempt to send: reuses the key when the body is unchanged, else a new key.
   * Resolves only after the attempt is durably saved — callers must await it before sending.
   */
  prepareAttempt: (body: CreateClaimBody) => Promise<ClaimAttempt>;
  completeAttempt: (claim: Claim) => void;
  discardAttempt: () => Promise<void>;
  trackClaim: (claim: Claim) => void;
};

const KEEP_CLAIMS_MS = 30 * 60_000;

const toTracked = ({ id, asset, amount, status, createdAt }: Claim): TrackedClaim => ({
  id,
  asset,
  amount,
  status,
  createdAt,
});

const prune = (claims: Record<string, TrackedClaim>): Record<string, TrackedClaim> =>
  Object.fromEntries(
    Object.entries(claims).filter(
      ([, claim]) => Date.now() - Date.parse(claim.createdAt) < KEEP_CLAIMS_MS,
    ),
  );

export const useClaimsStore = create<ClaimsState>()(
  persist(
    (set, get) => ({
      attempt: null,
      attemptLoaded: false,
      claims: {},
      prepareAttempt: async (body) => {
        const current = get().attempt;
        if (current && sameClaimBody(current.body, body)) return current;
        const attempt = { idempotencyKey: randomUUID(), body };
        await claimAttemptStorage.save(attempt);
        set({ attempt });
        return attempt;
      },
      completeAttempt: (claim) => {
        set((state) => ({
          attempt: null,
          claims: { ...prune(state.claims), [claim.id]: toTracked(claim) },
        }));
        // Safe if this write is lost: a retry with the old key just replays the same claim.
        void claimAttemptStorage.clear();
      },
      discardAttempt: async () => {
        await claimAttemptStorage.clear();
        set({ attempt: null });
      },
      trackClaim: (claim) =>
        set((state) => ({ claims: { ...state.claims, [claim.id]: toTracked(claim) } })),
    }),
    {
      name: 'cashmine-claims',
      storage: createJSONStorage(() => AsyncStorage),
      // The attempt is persisted separately (awaited writes), see claim-attempt-storage.ts.
      partialize: ({ claims }) => ({ claims }),
    },
  ),
);

export const loadClaimAttempt = async (): Promise<void> => {
  const attempt = await claimAttemptStorage.load().catch(() => null);
  useClaimsStore.setState({ attempt, attemptLoaded: true });
};

/** True once tracked claims and the in-flight attempt are restored; gate claim UI on this. */
export function useClaimsReady(): boolean {
  const attemptLoaded = useClaimsStore((s) => s.attemptLoaded);
  const [hydrated, setHydrated] = useState(() => useClaimsStore.persist.hasHydrated());
  useEffect(() => useClaimsStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (!useClaimsStore.getState().attemptLoaded) void loadClaimAttempt();
  }, []);
  return hydrated && attemptLoaded;
}
