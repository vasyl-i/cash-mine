import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/button';
import { BalanceRow } from '@/components/molecules/balance-row';
import { StatusMessage } from '@/components/molecules/status-message';
import { colors } from '@/constants/theme';
import { useBalances } from '@/hooks/use-balances';
import { useAuthStore } from '@/store/auth-store';
import { errorMessage, formatTime } from '@/utils/errors';

export function BalanceList() {
  const router = useRouter();
  const clearToken = useAuthStore((s) => s.clearToken);
  const { rows, totalUsd, asOf, isStale, isPending, isError, error, refetch, isRefetching } =
    useBalances();

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Balances</Text>
        <Button title="Change token" variant="link" onPress={() => clearToken()} />
      </View>
      {totalUsd && (
        <Text style={styles.total} testID="total-usd">
          {totalUsd}
          <Text style={styles.totalLabel}> available</Text>
        </Text>
      )}
      <View style={styles.titleRow}>
        <Text style={styles.asOf}>{asOf ? `As of ${formatTime(asOf)}` : ' '}</Text>
        <Button
          title={isRefetching ? 'Refreshing…' : 'Refresh'}
          variant="link"
          onPress={() => refetch()}
          disabled={isRefetching}
        />
      </View>
      {isStale && (
        <StatusMessage
          tone="warning"
          testID="stale-banner"
          message={
            isError
              ? `Couldn't refresh (${errorMessage(error)}). Showing older data.`
              : 'These balances may be out of date.'
          }
        />
      )}
    </View>
  );

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError && rows.length === 0 && !isStale) {
    return (
      <View style={styles.flex}>
        {header}
        <StatusMessage
          tone="error"
          message={`Couldn't load balances. ${errorMessage(error)}`}
          actionLabel="Retry"
          onAction={() => refetch()}
          testID="balances-error"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.asset}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <StatusMessage tone="info" message="No balances yet." testID="balances-empty" />
      }
      renderItem={({ item }) => (
        <BalanceRow
          balance={item}
          onPress={() => router.push({ pathname: '/claim/[asset]', params: { asset: item.asset } })}
        />
      )}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 16, paddingHorizontal: 16, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  total: { fontSize: 22, fontWeight: '600', color: colors.text },
  totalLabel: { fontSize: 14, fontWeight: '400', color: colors.muted },
  asOf: { fontSize: 13, color: colors.muted },
});
