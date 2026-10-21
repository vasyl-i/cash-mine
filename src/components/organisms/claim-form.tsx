import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/atoms/button';
import { StatusMessage } from '@/components/molecules/status-message';
import { colors } from '@/constants/theme';
import { useClaimForm } from '@/hooks/use-claim-form';
import { errorMessage } from '@/utils/errors';
import { formatAmountDisplay, type ClaimAmountError } from '@/utils/money';

const validationText: Record<ClaimAmountError, string> = {
  empty: 'Enter an amount.',
  format: 'Use digits with an optional dot, e.g. 0.5 or 12.',
  too_many_decimals: 'Too many decimal places for this asset.',
  zero: 'Amount must be greater than 0.',
  below_min: 'Amount is below the minimum.',
  above_available: 'Amount is more than you can claim.',
  not_above_fee: 'Amount must be greater than the fee.',
};

export function ClaimForm({ asset }: { asset: string }) {
  const router = useRouter();
  const form = useClaimForm(asset);
  const { balance, options, balances, mutation, validation } = form;

  if (mutation.data) {
    return <Redirect href={{ pathname: '/claims/[id]', params: { id: mutation.data.id } }} />;
  }
  if (balances.isPending || options.isPending) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (options.isError || !balance || !options.data) {
    return (
      <StatusMessage
        tone="error"
        message={
          options.isError
            ? `Couldn't load claim options. ${errorMessage(options.error)}`
            : `No ${asset} balance found.`
        }
        actionLabel={options.isError ? 'Retry' : 'Back'}
        onAction={() => (options.isError ? void options.refetch() : router.back())}
      />
    );
  }

  const d = balance.decimals;
  const showError = form.amountText.length > 0 && validation && !validation.ok;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Button title="‹ Back" variant="link" onPress={() => router.back()} />
      <Text style={styles.title}>Claim {asset}</Text>
      <Text style={styles.muted} testID="claimable">
        You can claim {formatAmountDisplay(form.claimable, d)} {asset}
      </Text>
      {form.unreflected > 0n && (
        <Text style={styles.muted}>
          ({formatAmountDisplay(form.unreflected, d)} {asset} in a recent claim is not yet reflected
          in the balance snapshot.)
        </Text>
      )}

      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          value={form.amountText}
          onChangeText={form.setAmountText}
          editable={!form.locked}
          inputMode="decimal"
          placeholder="0.0"
          style={[styles.input, styles.flex]}
          testID="amount-input"
        />
        <Button title="Max" variant="secondary" onPress={form.setMax} disabled={form.locked} />
      </View>
      {showError && <Text style={styles.error}>{validationText[validation.error]}</Text>}
      {form.fieldError && <Text style={styles.error}>{form.fieldError}</Text>}

      <Text style={styles.label}>Destination</Text>
      {form.destinations.map((dest) => (
        <Button
          key={dest.id}
          title={`${dest.id === form.destinationId ? '● ' : '○ '}${dest.label}`}
          variant="secondary"
          disabled={form.locked}
          onPress={() => form.setDestination(dest.id)}
        />
      ))}

      <View style={styles.summary}>
        <Text style={styles.muted}>
          Minimum {options.data.minAmount} {asset}
        </Text>
        <Text style={styles.muted}>
          Fee {options.data.fee} {asset}
        </Text>
        <Text style={styles.receive} testID="receive-amount">
          You receive {validation?.ok ? formatAmountDisplay(validation.receive, d) : '—'} {asset}
        </Text>
      </View>

      {form.hasUnconfirmedAttempt ? (
        <>
          <StatusMessage
            tone="warning"
            message={`We couldn't confirm your claim${mutation.isError ? ` (${errorMessage(mutation.error)})` : ''}. It may have gone through. Retrying sends the same request and can't create a second claim.`}
          />
          <Button title="Retry safely" onPress={form.retrySame} loading={mutation.isPending} />
          <Button title="Discard and start over" variant="link" onPress={form.discard} />
        </>
      ) : (
        <>
          {mutation.isError && !form.fieldError && (
            <StatusMessage tone="error" message={errorMessage(mutation.error)} />
          )}
          <Button
            title="Claim"
            onPress={form.submit}
            disabled={!validation?.ok || !form.destinationId}
            loading={mutation.isPending}
            testID="claim-submit"
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1 },
  flex: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 },
  muted: { fontSize: 14, color: colors.muted },
  amountRow: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 18,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14 },
  summary: { gap: 4, paddingVertical: 8 },
  receive: { fontSize: 17, fontWeight: '700', color: colors.text },
});
