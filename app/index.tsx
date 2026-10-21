import { StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/templates/screen-container';
import { isEnvConfigured } from '@/config/env';

// Placeholder — replaced by the Balances screen in the implementation stage.
export default function HomeRoute() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>CashMine</Text>
      <Text testID="env-status">API config: {isEnvConfigured() ? 'loaded' : 'missing'}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', padding: 16 },
});
