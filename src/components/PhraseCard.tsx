import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phrase, chineseText } from '../types/phrase';
import { ScriptMode } from '../types/phrase';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { HskBadge } from './HskBadge';

interface PhraseCardProps {
  phrase: Phrase;
  scriptMode: ScriptMode;
  showPinyin: boolean;
  showDefinition: boolean;
  showExample?: boolean;
  compact?: boolean;
}

export function PhraseCard({
  phrase,
  scriptMode,
  showPinyin,
  showDefinition,
  showExample = true,
  compact = false,
}: PhraseCardProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.header}>
        <HskBadge level={phrase.hskLevel} />
        <Text style={[styles.topic, { color: palette.textTertiary }]}>· {phrase.topic}</Text>
      </View>

      <Text
        style={[
          compact ? typography.hanziCompact : typography.hanzi,
          styles.hanzi,
          { color: palette.textPrimary },
        ]}
      >
        {chineseText(phrase, scriptMode)}
      </Text>

      {showPinyin && (
        <Text style={[typography.pinyin, styles.pinyin, { color: palette.accent }]}>
          {phrase.pinyin}
        </Text>
      )}

      {showDefinition && (
        <Text style={[typography.definition, styles.definition, { color: palette.textSecondary }]}>
          {phrase.definition}
        </Text>
      )}

      {showExample && (
        <View style={[styles.exampleBlock, { borderTopColor: palette.border }]}>
          <Text style={[typography.example, { color: palette.textPrimary }]}>
            {phrase.exampleSentence}
          </Text>
          {showPinyin && (
            <Text style={[typography.caption, styles.examplePinyin, { color: palette.textTertiary }]}>
              {phrase.exampleSentencePinyin}
            </Text>
          )}
          {showDefinition && (
            <Text style={[typography.example, styles.exampleTranslation, { color: palette.textSecondary }]}>
              {phrase.exampleSentenceTranslation}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    // Left-aligned deliberately: HomeScreen overlays small favorite/learned
    // icons in the card's top-right corner, so nothing here should compete
    // for that space.
    marginBottom: 20,
  },
  topic: {
    fontSize: 13,
    fontWeight: '500',
  },
  hanzi: {
    textAlign: 'center',
    marginBottom: 12,
  },
  pinyin: {
    textAlign: 'center',
    marginBottom: 10,
  },
  definition: {
    textAlign: 'center',
  },
  exampleBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  examplePinyin: {
    marginTop: 6,
  },
  exampleTranslation: {
    marginTop: 6,
  },
});
