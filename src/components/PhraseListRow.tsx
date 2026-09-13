import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phrase, chineseText, ScriptMode } from '../types/phrase';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { HskBadge } from './HskBadge';

interface PhraseListRowProps {
  phrase: Phrase;
  scriptMode: ScriptMode;
  subtitle?: string;
}

export function PhraseListRow({ phrase, scriptMode, subtitle }: PhraseListRowProps) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: palette.border }]}>
      <View style={styles.textBlock}>
        <Text style={[typography.hanziCompact, { color: palette.textPrimary, fontSize: 24, lineHeight: 30 }]}>
          {chineseText(phrase, scriptMode)}
        </Text>
        <Text style={[typography.body, { color: palette.textSecondary }]} numberOfLines={1}>
          {phrase.pinyin} · {phrase.definition}
        </Text>
        {subtitle && (
          <Text style={[typography.caption, { color: palette.textTertiary, marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
      <HskBadge level={phrase.hskLevel} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
});
