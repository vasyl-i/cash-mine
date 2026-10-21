import { z } from 'zod';

// Amounts stay strings at the boundary; money utils convert them to bigint minor units.
const amount = z.string().regex(/^-?(0|[1-9]\d*)(\.\d+)?$/, 'invalid amount string');

export const balanceSchema = z.object({
  asset: z.string().min(1),
  decimals: z.number().int().min(0).max(36),
  available: amount,
  pending: amount,
  claiming: amount,
  usdPrice: amount,
});

export const balancesSchema = z.object({
  asOf: z.string(),
  items: z.array(balanceSchema),
});

export const claimOptionsSchema = z.object({
  asset: z.string(),
  minAmount: amount,
  fee: amount,
  destinations: z.array(z.object({ id: z.string(), label: z.string() })),
});

export const claimStatusSchema = z.enum(['pending', 'completed', 'failed']);

export const claimSchema = z.object({
  id: z.string(),
  asset: z.string(),
  amount,
  fee: amount,
  receiveAmount: amount,
  destinationId: z.string(),
  status: claimStatusSchema,
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['accrual', 'reversal', 'claim']),
  asset: z.string(),
  amount,
  status: z.string(),
  exchange: z.string().nullable(),
  createdAt: z.string(),
  relatedId: z.string().nullable(),
});

export const activityPageSchema = z.object({
  items: z.array(activityItemSchema),
  nextCursor: z.string().nullable(),
});

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
    retryAfterMs: z.number().optional(),
  }),
});

export type Balance = z.infer<typeof balanceSchema>;
export type Balances = z.infer<typeof balancesSchema>;
export type ClaimOptions = z.infer<typeof claimOptionsSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ActivityPage = z.infer<typeof activityPageSchema>;
