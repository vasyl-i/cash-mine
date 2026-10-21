import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TokenGate } from '@/components/templates/token-gate';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <TokenGate>
        <Stack screenOptions={{ headerShown: false }} />
      </TokenGate>
    </AppProviders>
  );
}
