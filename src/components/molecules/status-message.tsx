import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/button';
import { colors } from '@/constants/theme';

type StatusMessageProps = {
  tone: 'error' | 'warning' | 'info' | 'success';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

const toneStyles = {
  error: { color: colors.danger, backgroundColor: colors.dangerBg },
  warning: { color: colors.warning, backgroundColor: colors.warningBg },
  success: { color: colors.success, backgroundColor: colors.successBg },
  info: { color: colors.muted, backgroundColor: colors.background },
} as const;

export function StatusMessage({
  tone,
  message,
  actionLabel,
  onAction,
  testID,
}: StatusMessageProps) {
  const { color, backgroundColor } = toneStyles[tone];
  return (
    <View
      style={[styles.box, { backgroundColor }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      testID={testID}>
      <Text style={[styles.text, { color }]}>{message}</Text>
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} variant="link" />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  text: { flex: 1, fontSize: 14 },
});
