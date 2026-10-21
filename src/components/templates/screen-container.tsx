import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PHONE_MAX_WIDTH } from '@/constants/layout';

export function ScreenContainer({ children }: PropsWithChildren) {
  return (
    <View style={styles.outer}>
      <SafeAreaView style={styles.inner}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', backgroundColor: '#f4f5f7' },
  inner: { flex: 1, width: '100%', maxWidth: PHONE_MAX_WIDTH, backgroundColor: '#ffffff' },
});
