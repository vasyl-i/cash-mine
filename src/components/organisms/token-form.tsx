import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/atoms/button';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export function TokenForm() {
  const rejected = useAuthStore((s) => s.rejected);
  const setToken = useAuthStore((s) => s.setToken);
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CashMine</Text>
      <Text style={styles.body}>
        Enter your API token. It is stored only in this browser and sent to the CashMine API.
      </Text>
      {rejected && (
        <Text style={styles.error} accessibilityRole="alert">
          That token was rejected (missing, invalid or expired). Please enter a valid one.
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="API token"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
        testID="token-input"
        onSubmitEditing={() => trimmed && setToken(trimmed)}
      />
      <Button
        title="Save token"
        onPress={() => setToken(trimmed)}
        disabled={!trimmed}
        testID="token-save"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.muted },
  error: { color: colors.danger, backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 16,
    color: colors.text,
  },
});
