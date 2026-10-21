import { useQuery } from '@tanstack/react-query';

import { getBalances } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import type { Balance } from '@/api/schemas';
import { formatAmountDisplay, formatUsd, parseApiAmount, usdValue } from '@/utils/money';

// Server recomputes snapshots every 15 s; older than this means something is off.
const STALE_SNAPSHOT_MS = 60_000;

export type BalanceView = {
  asset: string;
  available: string;
  pending: string;
  claiming: string;
  availableUsd: string;
  canClaim: boolean;
};

export function toBalanceView(item: Balance): BalanceView {
  const available = parseApiAmount(item.available, item.decimals);
  return {
    asset: item.asset,
    available: formatAmountDisplay(available, item.decimals),
    pending: formatAmountDisplay(parseApiAmount(item.pending, item.decimals), item.decimals),
    claiming: formatAmountDisplay(parseApiAmount(item.claiming, item.decimals), item.decimals),
    availableUsd: formatUsd(usdValue(available, item.decimals, item.usdPrice)),
    canClaim: available > 0n,
  };
}

/** Total of available balances in USD, summed before rounding. */
export function totalAvailableUsd(items: Balance[]): string {
  return formatUsd(
    items.reduce(
      (sum, item) =>
        sum + usdValue(parseApiAmount(item.available, item.decimals), item.decimals, item.usdPrice),
      0n,
    ),
  );
}

export function useBalances() {
  const query = useQuery({
    queryKey: queryKeys.balances,
    queryFn: ({ signal }) => getBalances(signal),
    refetchInterval: 15_000,
  });

  const data = query.data;
  const asOf = data ? new Date(data.asOf) : null;
  // Compare against when we received it (pure): refresh failures are covered by isRefetchError.
  const snapshotOld = asOf ? query.dataUpdatedAt - asOf.getTime() > STALE_SNAPSHOT_MS : false;

  return {
    ...query,
    rows: data?.items.map(toBalanceView) ?? [],
    totalUsd: data ? totalAvailableUsd(data.items) : null,
    asOf,
    // Showing cached data while the latest refresh failed, or the snapshot itself is old.
    isStale: !!data && (query.isRefetchError || snapshotOld),
  };
}
