import AsyncStorage from '@react-native-async-storage/async-storage';

import { claimAttemptStorage } from '@/store/claim-attempt-storage';
import { loadClaimAttempt, useClaimsStore } from '@/store/claims-store';

let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `key-${++mockUuidCounter}` }));

const body = { asset: 'ETH', amount: '0.5', destinationId: 'dest_wallet' };

beforeEach(async () => {
  await AsyncStorage.clear();
  useClaimsStore.setState({ attempt: null, attemptLoaded: false, claims: {} });
});

describe('claims store — idempotency key durability', () => {
  it('resolves only after the attempt is written to storage', async () => {
    let releaseWrite: () => void = () => {};
    const order: string[] = [];
    const realSetItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    const spy = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
      await new Promise<void>((resolve) => (releaseWrite = resolve));
      await realSetItem(key, value);
      order.push(`write:${key}`);
    });

    const pending = useClaimsStore
      .getState()
      .prepareAttempt(body)
      .then((attempt) => {
        order.push('resolved');
        return attempt;
      });
    await Promise.resolve();
    expect(order).toEqual([]); // not resolved while the write is pending

    releaseWrite();
    const attempt = await pending;
    expect(order[order.length - 1]).toBe('resolved');
    expect(order).toContain('write:cashmine-claim-attempt');
    expect(await claimAttemptStorage.load()).toEqual(attempt);
    spy.mockImplementation(realSetItem);
  });

  it('reuses the key for the same body and issues a new key for a different body', async () => {
    const first = await useClaimsStore.getState().prepareAttempt(body);
    const again = await useClaimsStore.getState().prepareAttempt({ ...body });
    const changed = await useClaimsStore.getState().prepareAttempt({ ...body, amount: '0.6' });
    expect(again.idempotencyKey).toBe(first.idempotencyKey);
    expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('restores a saved attempt after a reload so a retry reuses the same key', async () => {
    const saved = await useClaimsStore.getState().prepareAttempt(body);
    useClaimsStore.setState({ attempt: null, attemptLoaded: false }); // simulate fresh app start
    await loadClaimAttempt();
    expect(useClaimsStore.getState().attempt).toEqual(saved);
    const retried = await useClaimsStore.getState().prepareAttempt(body);
    expect(retried.idempotencyKey).toBe(saved.idempotencyKey);
  });

  it('clears the saved attempt on discard', async () => {
    await useClaimsStore.getState().prepareAttempt(body);
    await useClaimsStore.getState().discardAttempt();
    expect(useClaimsStore.getState().attempt).toBeNull();
    expect(await claimAttemptStorage.load()).toBeNull();
  });
});
