// Public runtime config. EXPO_PUBLIC_* vars are inlined at build time and must be
// referenced statically (process.env.EXPO_PUBLIC_X), not via dynamic lookup.
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  // Dev-only fallback token. The brief forbids the token in the repo or deployed build:
  // in production `__DEV__` is false, so the minifier drops this branch and the value is
  // never inlined. Production users enter their token in the app (stored in the browser).
  devApiToken: __DEV__ ? (process.env.EXPO_PUBLIC_API_TOKEN ?? '') : '',
} as const;

export const isEnvConfigured = (): boolean => env.apiUrl.length > 0;
