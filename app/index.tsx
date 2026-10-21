import { StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/templates/screen-container';
import { env, isEnvConfigured } from '@/config/env';

// Placeholder — replaced by the Balances screen in the implementation stage.
export default function HomeRoute() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>CashMine</Text>
      <Text testID="env-status">API URL: {isEnvConfigured() ? 'loaded' : 'missing'}</Text>
      <Text testID="dev-token-status">Dev token: {env.devApiToken ? 'loaded' : 'none'}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', padding: 16 },
});
