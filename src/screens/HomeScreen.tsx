import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useAppStore } from '../store/useAppStore';
import { PhraseCard } from '../components/PhraseCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';

export function HomeScreen() {
  const { palette } = useTheme();
  const currentPhrase = useAppStore(s => s.currentPhrase);
  const settings = useAppStore(s => s.settings);
  const userData = useAppStore(s => s.userData);
  const nextPhrase = useAppStore(s => s.nextPhrase);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const toggleLearned = useAppStore(s => s.toggleLearned);

  if (!currentPhrase) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <EmptyState
          title="No phrases available"
          message="No phrases match your selected HSK level. Try switching to Mixed / All Levels in Settings."
        />
      </SafeAreaView>
    );
  }

  const isFavorite = userData.favoriteIds.includes(currentPhrase.id);
  const isLearned = userData.learnedIds.includes(currentPhrase.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.caption, { color: palette.textTertiary }]}>TODAY'S PHRASE</Text>

        <View style={styles.cardWrapper}>
          <PhraseCard
            phrase={currentPhrase}
            scriptMode={settings.scriptMode}
            showPinyin={settings.showPinyin}
            showDefinition={settings.showDefinition}
          />

          <View style={styles.cardActions}>
            <Pressable
              onPress={() => toggleFavorite(currentPhrase.id)}
              hitSlop={8}
              style={[styles.miniAction, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[styles.miniActionGlyph, { color: isFavorite ? palette.accent : palette.textTertiary }]}>
                {isFavorite ? '★' : '☆'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => toggleLearned(currentPhrase.id)}
              hitSlop={8}
              style={[styles.miniAction, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[styles.miniActionGlyph, { color: isLearned ? palette.accent : palette.textTertiary }]}>
                {isLearned ? '✓' : '○'}
              </Text>
            </Pressable>
          </View>
        </View>

        <PrimaryButton label="Show me another phrase" onPress={nextPhrase} style={styles.nextButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginTop: 12,
    position: 'relative',
  },
  // A small, corner-anchored action cluster rather than a full-width row —
  // it sits over the card without covering the phrase, pinyin, or definition.
  cardActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  miniAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniActionGlyph: {
    fontSize: 15,
    lineHeight: 17,
  },
  nextButton: {
    marginTop: 28,
  },
});
