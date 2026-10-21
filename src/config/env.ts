// Public runtime config. EXPO_PUBLIC_* vars are inlined at build time and must be
// referenced statically (process.env.EXPO_PUBLIC_X), not via dynamic lookup.
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  apiToken: process.env.EXPO_PUBLIC_API_TOKEN ?? '',
} as const;

export const isEnvConfigured = (): boolean => env.apiUrl.length > 0 && env.apiToken.length > 0;
