import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/button';
import { StatusMessage } from '@/components/molecules/status-message';
import { colors } from '@/constants/theme';
import { useClaimStatus } from '@/hooks/use-claim-status';
import { errorMessage } from '@/utils/errors';

export function ClaimStatusCard({ id }: { id: string }) {
  const router = useRouter();
  const { data: claim, isPending, isError, error, refetch } = useClaimStatus(id);

  if (isPending) return <ActivityIndicator style={styles.flex} size="large" />;
  if (!claim) {
    return (
      <StatusMessage
        tone="error"
        message={`Couldn't load claim status. ${isError ? errorMessage(error) : ''}`}
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
    );
  }

  return (
    <View style={styles.container} testID="claim-status">
      <Text style={styles.title}>
        Claim {claim.amount} {claim.asset}
      </Text>
      {claim.status === 'pending' && (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.text}>Processing… usually settles within ~20 seconds.</Text>
        </View>
      )}
      {claim.status === 'completed' && (
        <StatusMessage
          tone="success"
          message={`Completed. You received ${claim.receiveAmount} ${claim.asset}.`}
        />
      )}
      {claim.status === 'failed' && (
        <StatusMessage
          tone="error"
          message={`Failed: ${claim.failureReason ?? 'unknown reason'}. The amount was returned to your available balance.`}
        />
      )}
      {isError && (
        <StatusMessage tone="warning" message={`Status update failed: ${errorMessage(error)}`} />
      )}
      <View style={styles.details}>
        <Text style={styles.text}>
          Fee {claim.fee} {claim.asset}
        </Text>
        <Text style={styles.text}>
          You receive {claim.receiveAmount} {claim.asset}
        </Text>
        <Text style={styles.muted}>ID {claim.id}</Text>
      </View>
      <Button title="Back to balances" variant="secondary" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  details: { gap: 4 },
});
