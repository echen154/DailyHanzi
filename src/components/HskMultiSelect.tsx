import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { HskLevel, LevelFilter } from '../types/phrase';
import { HSK_OPTIONS } from '../types/settings';
import { ALL_PHRASES } from '../data/phrases';

interface HskMultiSelectProps {
  value: LevelFilter;
  onChange: (value: LevelFilter) => void;
}

/**
 * One representative phrase per level, so a user can gauge roughly how hard
 * a level is before committing to it — the first seed-data phrase at each
 * level, not a hand-picked list, so it never drifts out of sync with
 * src/data/phraseData.json.
 */
const EXAMPLE_BY_LEVEL: Partial<Record<HskLevel, (typeof ALL_PHRASES)[number]>> = {};
for (const phrase of ALL_PHRASES) {
  if (!EXAMPLE_BY_LEVEL[phrase.hskLevel]) {
    EXAMPLE_BY_LEVEL[phrase.hskLevel] = phrase;
  }
}

/**
 * Lets the user pick "Mixed / All levels" as a single shortcut, or check any
 * combination of individual HSK levels. Picking a specific level while
 * "Mixed" is active starts a fresh custom selection with just that level;
 * unchecking every level is allowed (the Home screen already has a friendly
 * empty state pointing the user back to "Mixed" in that case).
 */
export function HskMultiSelect({ value, onChange }: HskMultiSelectProps) {
  const { palette } = useTheme();
  const isMixed = value === 'mixed';
  const selectedLevels = isMixed ? [] : value;

  function toggleLevel(level: HskLevel) {
    if (isMixed) {
      onChange([level]);
      return;
    }
    const next = selectedLevels.includes(level)
      ? selectedLevels.filter(l => l !== level)
      : [...selectedLevels, level].sort((a, b) => a - b);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange('mixed')}
        style={[
          styles.row,
          { backgroundColor: isMixed ? palette.accentSoft : palette.surface, borderColor: isMixed ? palette.accent : palette.border },
        ]}
      >
        <Text
          style={[typography.body, { color: isMixed ? palette.accent : palette.textPrimary, fontWeight: isMixed ? '700' : '400' }]}
        >
          {HSK_OPTIONS.find(o => o.value === 'mixed')?.label}
        </Text>
        <Checkbox checked={isMixed} palette={palette} />
      </Pressable>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.levelGrid}>
        {HSK_OPTIONS.filter(o => o.value !== 'mixed').map(option => {
          const level = option.value as HskLevel;
          const selected = !isMixed && selectedLevels.includes(level);
          const example = EXAMPLE_BY_LEVEL[level];
          return (
            <Pressable
              key={level}
              onPress={() => toggleLevel(level)}
              style={[
                styles.levelChip,
                { backgroundColor: selected ? palette.accentSoft : palette.surface, borderColor: selected ? palette.accent : palette.border },
              ]}
            >
              <View style={styles.levelChipHeader}>
                <Text style={[typography.body, { color: selected ? palette.accent : palette.textPrimary, fontWeight: selected ? '700' : '400' }]}>
                  {option.label}
                </Text>
                <Checkbox checked={selected} palette={palette} />
              </View>
              {example && (
                <Text
                  style={[typography.caption, styles.levelExample, { color: selected ? palette.accent : palette.textTertiary }]}
                  numberOfLines={1}
                >
                  Ex: {example.simplified} · {example.pinyin} — {example.definition}.
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Checkbox({ checked, palette }: { checked: boolean; palette: { accent: string; border: string } }) {
  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: checked ? palette.accent : 'transparent',
          borderColor: checked ? palette.accent : palette.border,
        },
      ]}
    >
      {checked && <Text style={styles.checkmark}>✓</Text>}
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelChip: {
    flexDirection: 'column',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    minWidth: '30%',
  },
  levelChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelExample: {
    fontSize: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
});
