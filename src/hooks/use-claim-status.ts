import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getClaim } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import { useClaimsStore } from '@/store/claims-store';

const POLL_MS = 2_000;

/** Polls a claim until it settles (completed | failed), then refreshes balances. */
export function useClaimStatus(id: string) {
  const queryClient = useQueryClient();
  const trackClaim = useClaimsStore((s) => s.trackClaim);
  const query = useQuery({
    queryKey: queryKeys.claim(id),
    queryFn: ({ signal }) => getClaim(id, signal),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? POLL_MS : false),
  });

  const claim = query.data;
  const status = claim?.status;

  useEffect(() => {
    if (!claim) return;
    trackClaim(claim);
    if (claim.status !== 'pending') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.balances });
    }
    // Only react to status transitions, not every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, claim?.id]);

  return query;
}
