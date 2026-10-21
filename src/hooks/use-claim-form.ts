import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError, isOutcomeUnknown } from '@/api/client';
import { createClaim, getClaimOptions } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import { useClaimsStore, type ClaimAttempt } from '@/store/claims-store';
import { unreflectedClaimAmount } from '@/utils/claims';
import { formatAmount, parseApiAmount, validateClaimAmount } from '@/utils/money';

import { useBalances } from './use-balances';

export function useClaimForm(asset: string) {
  const queryClient = useQueryClient();
  const balances = useBalances();
  const options = useQuery({
    queryKey: queryKeys.claimOptions(asset),
    queryFn: ({ signal }) => getClaimOptions(asset, signal),
  });
  const { attempt, claims, prepareAttempt, completeAttempt, discardAttempt } = useClaimsStore();

  // A persisted attempt for this asset whose outcome we never learned (e.g. reload mid-request).
  const pendingAttempt = attempt?.body.asset === asset ? attempt : null;
  const [amountText, setAmountText] = useState(pendingAttempt?.body.amount ?? '');
  const [pickedDestination, setPickedDestination] = useState(pendingAttempt?.body.destinationId);

  const balance = balances.data?.items.find((item) => item.asset === asset);
  const destinations = options.data?.destinations ?? [];
  const destinationId = pickedDestination ?? destinations[0]?.id;

  // Option C: snapshot numbers stay authoritative; our not-yet-reflected claims reduce what can be claimed.
  const unreflected =
    balance && balances.data
      ? unreflectedClaimAmount(Object.values(claims), asset, balances.data.asOf, balance.decimals)
      : 0n;
  const snapshotAvailable = balance ? parseApiAmount(balance.available, balance.decimals) : 0n;
  const claimable = snapshotAvailable > unreflected ? snapshotAvailable - unreflected : 0n;

  const validation =
    balance && options.data
      ? validateClaimAmount({
          input: amountText,
          decimals: balance.decimals,
          available: formatAmount(claimable, balance.decimals),
          minAmount: options.data.minAmount,
          fee: options.data.fee,
        })
      : null;

  const mutation = useMutation({
    mutationFn: (toSend: ClaimAttempt) => createClaim(toSend.body, toSend.idempotencyKey),
    onSuccess: (claim) => {
      completeAttempt(claim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.balances });
    },
  });

  const outcomeUnknown = mutation.isError && isOutcomeUnknown(mutation.error);
  const fieldError =
    mutation.error instanceof ApiError && mutation.error.code === 'VALIDATION'
      ? mutation.error.message
      : null;

  const submit = () => {
    if (!validation?.ok || !balance || !destinationId || mutation.isPending) return;
    const body = {
      asset,
      amount: formatAmount(validation.amount, balance.decimals),
      destinationId,
    };
    mutation.mutate(prepareAttempt(body));
  };

  /** Re-send the exact same body + Idempotency-Key (safe: server replays the original claim). */
  const retrySame = () => {
    if (attempt && !mutation.isPending) mutation.mutate(attempt);
  };

  const edit = (setter: () => void) => {
    if (mutation.isError && !outcomeUnknown) mutation.reset();
    setter();
  };

  return {
    balance,
    options,
    balances,
    destinations,
    destinationId,
    amountText,
    setAmountText: (text: string) => edit(() => setAmountText(text)),
    setDestination: (id: string) => edit(() => setPickedDestination(id)),
    setMax: () => balance && edit(() => setAmountText(formatAmount(claimable, balance.decimals))),
    claimable,
    unreflected,
    validation,
    submit,
    retrySame,
    // Unknown outcome: inputs stay locked to the sent body until the user retries or discards.
    locked: mutation.isPending || outcomeUnknown || (!!pendingAttempt && mutation.isIdle),
    hasUnconfirmedAttempt: outcomeUnknown || (!!pendingAttempt && mutation.isIdle),
    discard: () => {
      discardAttempt();
      mutation.reset();
    },
    mutation,
    fieldError,
  };
}
