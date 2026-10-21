import { sameClaimBody, unreflectedClaimAmount, type TrackedClaim } from '@/utils/claims';

const claim = (overrides: Partial<TrackedClaim>): TrackedClaim => ({
  id: 'clm_1',
  asset: 'ETH',
  amount: '0.5',
  status: 'pending',
  createdAt: '2026-10-21T17:00:10.000Z',
  ...overrides,
});

describe('unreflectedClaimAmount', () => {
  const D = 18;
  const half = 5n * 10n ** 17n;

  it('counts claims created after the snapshot', () => {
    expect(unreflectedClaimAmount([claim({})], 'ETH', '2026-10-21T17:00:00.000Z', D)).toBe(half);
  });

  it('ignores claims already included in the snapshot', () => {
    expect(unreflectedClaimAmount([claim({})], 'ETH', '2026-10-21T17:00:15.000Z', D)).toBe(0n);
    // exactly equal: snapshot is at/after creation → included
    expect(unreflectedClaimAmount([claim({})], 'ETH', '2026-10-21T17:00:10.000Z', D)).toBe(0n);
  });

  it('ignores failed claims (funds returned) and other assets', () => {
    const claims = [claim({ status: 'failed' }), claim({ id: 'clm_2', asset: 'BTC' })];
    expect(unreflectedClaimAmount(claims, 'ETH', '2026-10-21T17:00:00.000Z', D)).toBe(0n);
  });

  it('still counts completed claims the snapshot has not caught up with', () => {
    const claims = [claim({ status: 'completed' }), claim({ id: 'clm_2', amount: '0.25' })];
    expect(unreflectedClaimAmount(claims, 'ETH', '2026-10-21T17:00:00.000Z', D)).toBe(
      half + half / 2n,
    );
  });
});

describe('sameClaimBody', () => {
  const body = { asset: 'ETH', amount: '0.5', destinationId: 'dest_wallet' };

  it('matches identical bodies only', () => {
    expect(sameClaimBody(body, { ...body })).toBe(true);
    expect(sameClaimBody(body, { ...body, amount: '0.6' })).toBe(false);
    expect(sameClaimBody(body, { ...body, destinationId: 'other' })).toBe(false);
  });
});
