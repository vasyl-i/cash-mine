import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TokenForm } from '@/components/organisms/token-form';
import { useAuthHydrated, useEffectiveToken } from '@/store/auth-store';

import { ScreenContainer } from './screen-container';

/** Renders children only once a token is available; data is per token, so the cache is reset on change. */
export function TokenGate({ children }: PropsWithChildren) {
  const hydrated = useAuthHydrated();
  const token = useEffectiveToken();
  const queryClient = useQueryClient();

  // Reset only on an actual token change (not on mount — clearing under active observers
  // orphans them and leaves the screen loading forever).
  const previousToken = useRef(token);
  useEffect(() => {
    if (previousToken.current === token) return;
    previousToken.current = token;
    queryClient.removeQueries({ type: 'inactive' });
    void queryClient.resetQueries();
  }, [token, queryClient]);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  if (!token) {
    return (
      <ScreenContainer>
        <TokenForm />
      </ScreenContainer>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
