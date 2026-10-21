import { isEnvConfigured } from '@/config/env';

describe('env config', () => {
  it('exposes a boolean configuration check', () => {
    expect(typeof isEnvConfigured()).toBe('boolean');
  });
});
