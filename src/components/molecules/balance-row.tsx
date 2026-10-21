import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { BalanceView } from '@/hooks/use-balances';

type BalanceRowProps = { balance: BalanceView; onPress: () => void };

export function BalanceRow({ balance, onPress }: BalanceRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${balance.asset}, available ${balance.available}. Tap to claim`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`balance-row-${balance.asset}`}>
      <View style={styles.header}>
        <Text style={styles.asset}>{balance.asset}</Text>
        <View style={styles.right}>
          <Text style={styles.available} selectable>
            {balance.available}
          </Text>
          <Text style={styles.usd}>≈ {balance.availableUsd}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Pending {balance.pending}</Text>
        <Text style={styles.metaText}>Claiming {balance.claiming}</Text>
        <Text style={[styles.metaText, styles.cta]}>{balance.canClaim ? 'Claim ›' : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 6,
  },
  pressed: { backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  asset: { fontSize: 17, fontWeight: '700', color: colors.text },
  right: { alignItems: 'flex-end', flexShrink: 1, marginLeft: 12 },
  available: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  usd: { fontSize: 13, color: colors.muted },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 13, color: colors.muted },
  cta: { marginLeft: 'auto', color: colors.primary, fontWeight: '600' },
});
