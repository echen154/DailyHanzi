import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface Option<T> {
  value: T;
  label: string;
}

interface OptionListProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function OptionList<T extends string | number>({ options, value, onChange }: OptionListProps<T>) {
  const { palette } = useTheme();

  return (
    <View style={styles.container}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[
              styles.row,
              {
                backgroundColor: selected ? palette.accentSoft : palette.surface,
                borderColor: selected ? palette.accent : palette.border,
              },
            ]}
          >
            <Text
              style={[
                typography.body,
                { color: selected ? palette.accent : palette.textPrimary, fontWeight: selected ? '700' : '400' },
              ]}
            >
              {option.label}
            </Text>
            {selected && <View style={[styles.dot, { backgroundColor: palette.accent }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
