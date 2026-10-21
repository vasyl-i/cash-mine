// Money math on bigint minor units (scale = asset `decimals`). Never use JS numbers for amounts.
// API amount format: digits, optional dot + digits, no leading zeros ("0.5", "12"; not ".5", "1.", "05", "1e-3").

const AMOUNT_RE = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

export type AmountError = 'empty' | 'format' | 'too_many_decimals';
export type ParseResult = { ok: true; value: bigint } | { ok: false; error: AmountError };

const pow10 = (n: number): bigint => 10n ** BigInt(n);

/** Strict parse of an unsigned API amount string into minor units. */
export function parseAmount(input: string, decimals: number): ParseResult {
  if (input.length === 0) return { ok: false, error: 'empty' };
  const match = AMOUNT_RE.exec(input);
  if (!match) return { ok: false, error: 'format' };
  const whole = match[1] ?? '0';
  const fraction = match[2] ?? '';
  if (fraction.length > decimals) return { ok: false, error: 'too_many_decimals' };
  return {
    ok: true,
    value: BigInt(whole) * pow10(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0'),
  };
}

/** Parse a signed API amount (activity uses negative amounts). */
export function parseSignedAmount(input: string, decimals: number): ParseResult {
  if (input.startsWith('-')) {
    const result = parseAmount(input.slice(1), decimals);
    return result.ok ? { ok: true, value: -result.value } : result;
  }
  return parseAmount(input, decimals);
}

/** Parse a value that came from the API; a malformed value is a contract violation, so throw. */
export function parseApiAmount(input: string, decimals: number): bigint {
  const result = parseSignedAmount(input, decimals);
  if (!result.ok)
    throw new Error(`Invalid API amount "${input}" (${result.error}, decimals=${decimals})`);
  return result.value;
}

/** User-typed text → strict format: trims and accepts a comma as decimal separator. */
export function parseUserAmount(input: string, decimals: number): ParseResult {
  return parseAmount(input.trim().replace(',', '.'), decimals);
}

/** Canonical API string: no trailing fractional zeros, no trailing dot. */
export function formatAmount(minor: bigint, decimals: number): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const scale = pow10(decimals);
  const whole = (abs / scale).toString();
  const fraction =
    decimals > 0 ? (abs % scale).toString().padStart(decimals, '0').replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Display string with thousands separators in the whole part (exact, no rounding). */
export function formatAmountDisplay(minor: bigint, decimals: number): string {
  const [whole = '0', fraction] = formatAmount(minor, decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

// USD values are display-only. Keep them at 1e-12 USD so per-asset values can be summed
// before a single rounding to cents.
const USD_SCALE_DECIMALS = 12;

/** Value of `minor` units at `usdPrice` (decimal string), in 1e-12 USD (truncated). */
export function usdValue(minor: bigint, decimals: number, usdPrice: string): bigint {
  const priceDecimals = usdPrice.split('.')[1]?.length ?? 0;
  const price = parseApiAmount(usdPrice, priceDecimals);
  return (minor * price * pow10(USD_SCALE_DECIMALS)) / pow10(decimals + priceDecimals);
}

/** Format a 1e-12 USD value as "$1,234.56" (round half away from zero). */
export function formatUsd(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = pow10(USD_SCALE_DECIMALS - 2);
  const cents = (abs + divisor / 2n) / divisor;
  const body = formatAmountDisplay(cents, 2);
  const [whole, fraction = ''] = body.split('.');
  return `${negative ? '-' : ''}$${whole}.${fraction.padEnd(2, '0')}`;
}

export type ClaimAmountError =
  AmountError | 'zero' | 'below_min' | 'above_available' | 'not_above_fee';

export type ClaimAmountInput = {
  input: string;
  decimals: number;
  available: string;
  minAmount: string;
  fee: string;
};

export type ClaimAmountResult =
  | { ok: true; amount: bigint; fee: bigint; receive: bigint }
  | { ok: false; error: ClaimAmountError };

/** Validate a user-entered claim amount: minAmount <= amount <= available and amount > fee. */
export function validateClaimAmount({
  input,
  decimals,
  available,
  minAmount,
  fee,
}: ClaimAmountInput): ClaimAmountResult {
  const parsed = parseUserAmount(input, decimals);
  if (!parsed.ok) return parsed;
  const amount = parsed.value;
  const feeMinor = parseApiAmount(fee, decimals);
  if (amount === 0n) return { ok: false, error: 'zero' };
  if (amount < parseApiAmount(minAmount, decimals)) return { ok: false, error: 'below_min' };
  if (amount > parseApiAmount(available, decimals)) return { ok: false, error: 'above_available' };
  if (amount <= feeMinor) return { ok: false, error: 'not_above_fee' };
  return { ok: true, amount, fee: feeMinor, receive: amount - feeMinor };
}
