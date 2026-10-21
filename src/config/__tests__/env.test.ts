import { env, isEnvConfigured } from '@/config/env';

describe('env config', () => {
  it('exposes a boolean configuration check', () => {
    expect(typeof isEnvConfigured()).toBe('boolean');
  });

  it('exposes the dev token as a string (empty outside dev builds)', () => {
    expect(typeof env.devApiToken).toBe('string');
  });
});
