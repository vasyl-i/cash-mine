import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CreateClaimBody } from '@/api/endpoints';
import type { Claim } from '@/api/schemas';
import { sameClaimBody, type TrackedClaim } from '@/utils/claims';

// An attempt = one logical claim. Its Idempotency-Key is reused for every retry of the same body
// (lost response, 5xx, 504, reload), so the server can never create a second claim.
export type ClaimAttempt = { idempotencyKey: string; body: CreateClaimBody };

type ClaimsState = {
  attempt: ClaimAttempt | null;
  claims: Record<string, TrackedClaim>;
  /** Returns the attempt to send: reuses the key when the body is unchanged, else a new key. */
  prepareAttempt: (body: CreateClaimBody) => ClaimAttempt;
  completeAttempt: (claim: Claim) => void;
  discardAttempt: () => void;
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
      claims: {},
      prepareAttempt: (body) => {
        const current = get().attempt;
        if (current && sameClaimBody(current.body, body)) return current;
        const attempt = { idempotencyKey: randomUUID(), body };
        set({ attempt });
        return attempt;
      },
      completeAttempt: (claim) =>
        set((state) => ({
          attempt: null,
          claims: { ...prune(state.claims), [claim.id]: toTracked(claim) },
        })),
      discardAttempt: () => set({ attempt: null }),
      trackClaim: (claim) =>
        set((state) => ({ claims: { ...state.claims, [claim.id]: toTracked(claim) } })),
    }),
    {
      name: 'cashmine-claims',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ attempt, claims }) => ({ attempt, claims }),
    },
  ),
);
