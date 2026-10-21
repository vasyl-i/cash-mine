import { apiFetch } from './client';
import { activityPageSchema, balancesSchema, claimOptionsSchema, claimSchema } from './schemas';

export type CreateClaimBody = { asset: string; amount: string; destinationId: string };

export const getBalances = (signal?: AbortSignal) =>
  apiFetch('/v1/balances', balancesSchema, { signal });

export const getClaimOptions = (asset: string, signal?: AbortSignal) =>
  apiFetch(`/v1/claim-options?asset=${encodeURIComponent(asset)}`, claimOptionsSchema, { signal });

/** Same key + same body is safe to repeat: the server returns the original claim. */
export const createClaim = (body: CreateClaimBody, idempotencyKey: string) =>
  apiFetch('/v1/claims', claimSchema, {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const getClaim = (id: string, signal?: AbortSignal) =>
  apiFetch(`/v1/claims/${encodeURIComponent(id)}`, claimSchema, { signal });

export const getActivity = (cursor: string | null, signal?: AbortSignal) =>
  apiFetch(
    `/v1/activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    activityPageSchema,
    { signal },
  );
