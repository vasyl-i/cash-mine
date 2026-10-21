import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { env } from '@/config/env';

// token: null = never entered (dev builds may fall back to the .env dev token);
// '' = explicitly cleared/rejected (no fallback, show the token form).
type AuthState = {
  token: string | null;
  rejected: boolean;
  setToken: (token: string) => void;
  clearToken: (reason?: 'rejected') => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      rejected: false,
      setToken: (token) => set({ token: token.trim(), rejected: false }),
      clearToken: (reason) => set({ token: '', rejected: reason === 'rejected' }),
    }),
    {
      name: 'cashmine-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

const resolveToken = (token: string | null): string => token ?? env.devApiToken;

/** Token for API calls outside React (user-entered token wins over the dev fallback). */
export const getEffectiveToken = (): string => resolveToken(useAuthStore.getState().token);

export const useEffectiveToken = (): string => resolveToken(useAuthStore((s) => s.token));

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}
