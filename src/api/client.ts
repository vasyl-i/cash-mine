import type { z } from 'zod';

import { env } from '@/config/env';
import { getEffectiveToken, useAuthStore } from '@/store/auth-store';

import { apiErrorBodySchema } from './schemas';

/** Server codes plus client-side NETWORK (no response) and INVALID_RESPONSE (unexpected body). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Errors worth retrying for reads (transient). */
export const isRetryableError = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.code === 'NETWORK' || error.status === 429 || error.status >= 500);

/**
 * For a write: did the request possibly reach the server and succeed anyway?
 * (lost response, 5xx, 504 timeout, or a 2xx we could not parse)
 */
export const isOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ApiError) ||
  error.code === 'NETWORK' ||
  error.code === 'INVALID_RESPONSE' ||
  error.status >= 500;

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function apiFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = 'GET', body, headers, signal }: RequestOptions = {},
): Promise<z.infer<S>> {
  const token = getEffectiveToken();
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'No API token');

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK', 'Network error — check your connection');
  }

  const json: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = apiErrorBodySchema.safeParse(json);
    const retryAfterHeader = Number(response.headers.get('Retry-After'));
    const retryAfterMs =
      parsed.data?.error.retryAfterMs ??
      (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : undefined);
    if (response.status === 401) useAuthStore.getState().clearToken('rejected');
    throw new ApiError(
      response.status,
      parsed.data?.error.code ?? 'SERVER',
      parsed.data?.error.message ?? `Request failed (${response.status})`,
      parsed.data?.error.field,
      retryAfterMs,
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Unexpected response from server');
  }
  return parsed.data;
}
