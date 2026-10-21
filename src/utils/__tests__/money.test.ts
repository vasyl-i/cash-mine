import {
  formatAmount,
  formatAmountDisplay,
  formatUsd,
  parseAmount,
  parseApiAmount,
  parseSignedAmount,
  parseUserAmount,
  usdValue,
  validateClaimAmount,
} from '@/utils/money';

describe('parseAmount', () => {
  it.each([
    ['0.5', 6, 500000n],
    ['12', 6, 12000000n],
    ['0', 6, 0n],
    ['820.413207', 6, 820413207n],
    ['0.0005', 8, 50000n],
    ['1.000000000000000001', 18, 1000000000000000001n],
    ['123456789012345678901234567890', 18, 123456789012345678901234567890n * 10n ** 18n],
    ['5', 0, 5n],
  ])('parses %s with %i decimals', (input, decimals, expected) => {
    expect(parseAmount(input, decimals)).toEqual({ ok: true, value: expected });
  });

  it.each(['.5', '1.', '05', '00', '1e-3', '-1', '+1', ' 1', '1 ', '1,5', 'abc', '1.2.3', 'NaN'])(
    'rejects malformed %j',
    (input) => {
      expect(parseAmount(input, 6)).toEqual({ ok: false, error: 'format' });
    },
  );

  it('rejects empty input', () => {
    expect(parseAmount('', 6)).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects more decimals than the asset allows', () => {
    expect(parseAmount('0.1234567', 6)).toEqual({ ok: false, error: 'too_many_decimals' });
    expect(parseAmount('1.0', 0)).toEqual({ ok: false, error: 'too_many_decimals' });
    expect(parseAmount('0.123456', 6)).toEqual({ ok: true, value: 123456n });
  });
});

describe('parseSignedAmount / parseApiAmount', () => {
  it('handles negative amounts', () => {
    expect(parseSignedAmount('-9.81', 6)).toEqual({ ok: true, value: -9810000n });
    expect(parseApiAmount('-0.5', 18)).toBe(-(5n * 10n ** 17n));
  });

  it('throws on malformed API values', () => {
    expect(() => parseApiAmount('1e-3', 6)).toThrow('Invalid API amount');
    expect(() => parseApiAmount('--1', 6)).toThrow();
  });
});

describe('parseUserAmount', () => {
  it('trims whitespace and accepts a comma separator', () => {
    expect(parseUserAmount('  0,5 ', 6)).toEqual({ ok: true, value: 500000n });
  });

  it('still rejects malformed input', () => {
    expect(parseUserAmount('.5', 6).ok).toBe(false);
    expect(parseUserAmount('1,000.5', 6).ok).toBe(false);
  });
});

describe('formatAmount', () => {
  it.each([
    [500000n, 6, '0.5'],
    [12000000n, 6, '12'],
    [0n, 6, '0'],
    [1n, 18, '0.000000000000000001'],
    [-9810000n, 6, '-9.81'],
    [5n, 0, '5'],
  ])('formats %s (%i decimals) as %s', (minor, decimals, expected) => {
    expect(formatAmount(minor, decimals)).toBe(expected);
  });

  it.each(['0.5', '12', '820.413207', '0.000000000000000001', '1234567.89'])(
    'round-trips %s',
    (value) => {
      const parsed = parseAmount(value, 18);
      if (!parsed.ok) throw new Error('parse failed');
      expect(formatAmount(parsed.value, 18)).toBe(value);
    },
  );

  it('normalises trailing zeros to the canonical API form', () => {
    const parsed = parseAmount('0.500', 6);
    if (!parsed.ok) throw new Error('parse failed');
    expect(formatAmount(parsed.value, 6)).toBe('0.5');
  });
});

describe('formatAmountDisplay', () => {
  it('groups thousands without rounding', () => {
    expect(formatAmountDisplay(1234567891234n, 6)).toBe('1,234,567.891234');
    expect(formatAmountDisplay(-1000000000n, 6)).toBe('-1,000');
    expect(formatAmountDisplay(0n, 6)).toBe('0');
  });
});

describe('usdValue / formatUsd', () => {
  it('values an asset amount at a decimal price', () => {
    // 820.413207 USDT * 1.0002 = 820.5772896414
    expect(formatUsd(usdValue(820413207n, 6, '1.0002'))).toBe('$820.58');
  });

  it('rounds half up to cents', () => {
    expect(formatUsd(usdValue(1005n, 3, '1'))).toBe('$1.01'); // 1.005
    expect(formatUsd(usdValue(1004n, 3, '1'))).toBe('$1.00'); // 1.004
  });

  it('handles 18-decimal assets and large prices', () => {
    // 0.5 ETH * 3456.78 = 1728.39
    expect(formatUsd(usdValue(5n * 10n ** 17n, 18, '3456.78'))).toBe('$1,728.39');
  });

  it('sums before rounding', () => {
    const total = usdValue(4n, 3, '1') + usdValue(4n, 3, '1'); // 0.004 + 0.004
    expect(formatUsd(total)).toBe('$0.01');
  });

  it('formats zero and integer prices', () => {
    expect(formatUsd(0n)).toBe('$0.00');
    expect(formatUsd(usdValue(2n, 0, '65000'))).toBe('$130,000.00');
  });
});

describe('validateClaimAmount', () => {
  const eth = { decimals: 18, available: '1.5', minAmount: '0.01', fee: '0.0012' };

  it('accepts a valid amount and computes receive = amount - fee', () => {
    const result = validateClaimAmount({ ...eth, input: '0.5' });
    expect(result).toEqual({
      ok: true,
      amount: 5n * 10n ** 17n,
      fee: 12n * 10n ** 14n,
      receive: 4988n * 10n ** 14n,
    });
    if (result.ok) expect(formatAmount(result.receive, 18)).toBe('0.4988');
  });

  it('accepts the boundaries minAmount and available', () => {
    expect(validateClaimAmount({ ...eth, input: '0.01' }).ok).toBe(true);
    expect(validateClaimAmount({ ...eth, input: '1.5' }).ok).toBe(true);
  });

  it('rejects one minor unit below min / above available', () => {
    expect(validateClaimAmount({ ...eth, input: '0.009999999999999999' })).toEqual({
      ok: false,
      error: 'below_min',
    });
    expect(validateClaimAmount({ ...eth, input: '1.500000000000000001' })).toEqual({
      ok: false,
      error: 'above_available',
    });
  });

  it('rejects zero, malformed and over-precise input', () => {
    expect(validateClaimAmount({ ...eth, input: '0' })).toEqual({ ok: false, error: 'zero' });
    expect(validateClaimAmount({ ...eth, input: '' })).toEqual({ ok: false, error: 'empty' });
    expect(validateClaimAmount({ ...eth, input: '.5' })).toEqual({ ok: false, error: 'format' });
    expect(validateClaimAmount({ ...eth, input: '0.5', decimals: 6, available: '1.5' })).toEqual({
      ok: true,
      amount: 500000n,
      fee: 1200n,
      receive: 498800n,
    });
    expect(
      validateClaimAmount({ ...eth, decimals: 6, input: '0.1234567', available: '1.5' }),
    ).toEqual({ ok: false, error: 'too_many_decimals' });
  });

  it('rejects amounts that would receive nothing (amount <= fee)', () => {
    const tinyMin = { ...eth, minAmount: '0.0001' };
    expect(validateClaimAmount({ ...tinyMin, input: '0.0012' })).toEqual({
      ok: false,
      error: 'not_above_fee',
    });
    expect(validateClaimAmount({ ...tinyMin, input: '0.0013' }).ok).toBe(true);
  });

  it('rejects everything when available is zero', () => {
    expect(validateClaimAmount({ ...eth, available: '0', input: '0.01' })).toEqual({
      ok: false,
      error: 'above_available',
    });
  });
});
