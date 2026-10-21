import type { CreateClaimBody } from '@/api/endpoints';
import type { ClaimStatus } from '@/api/schemas';

import { parseApiAmount } from './money';

export type TrackedClaim = {
  id: string;
  asset: string;
  amount: string;
  status: ClaimStatus;
  createdAt: string;
};

/**
 * Amount (minor units) of our own claims that the balance snapshot does not include yet.
 * A snapshot taken before the claim was created (asOf < createdAt, both server clocks) still counts
 * the amount as available. Failed claims return funds to available, so they never reduce it.
 */
export function unreflectedClaimAmount(
  claims: TrackedClaim[],
  asset: string,
  asOf: string,
  decimals: number,
): bigint {
  const snapshotTime = Date.parse(asOf);
  return claims
    .filter(
      (claim) =>
        claim.asset === asset &&
        claim.status !== 'failed' &&
        Date.parse(claim.createdAt) > snapshotTime,
    )
    .reduce((sum, claim) => sum + parseApiAmount(claim.amount, decimals), 0n);
}

export const sameClaimBody = (a: CreateClaimBody, b: CreateClaimBody): boolean =>
  a.asset === b.asset && a.amount === b.amount && a.destinationId === b.destinationId;
