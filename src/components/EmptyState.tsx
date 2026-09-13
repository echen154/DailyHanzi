import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export function EmptyState({ title, message }: { title: string; message: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: palette.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingVertical: 64,
    alignItems: 'center',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
  },
});
