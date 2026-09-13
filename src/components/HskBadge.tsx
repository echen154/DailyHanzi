import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HskLevel } from '../types/phrase';
import { useTheme } from '../theme/ThemeProvider';

export function HskBadge({ level }: { level: HskLevel }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: palette.accentSoft }]}>
      <Text style={[styles.text, { color: palette.accent }]}>HSK {level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
