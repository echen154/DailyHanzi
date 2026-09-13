import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useAppStore } from '../store/useAppStore';
import { PhraseCard } from '../components/PhraseCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { ReportIssueModal } from '../components/ReportIssueModal';

export function HomeScreen() {
  const { palette } = useTheme();
  const currentPhrase = useAppStore(s => s.currentPhrase);
  const settings = useAppStore(s => s.settings);
  const userData = useAppStore(s => s.userData);
  const nextPhrase = useAppStore(s => s.nextPhrase);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const toggleLearned = useAppStore(s => s.toggleLearned);
  const reportPhrase = useAppStore(s => s.reportPhrase);
  const [reportVisible, setReportVisible] = useState(false);

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
        </View>

        <View style={styles.iconRow}>
          <Pressable
            onPress={() => toggleFavorite(currentPhrase.id)}
            style={[styles.iconButton, { borderColor: palette.border }]}
          >
            <Text style={{ fontSize: 20 }}>{isFavorite ? '★' : '☆'}</Text>
            <Text style={[typography.caption, { color: palette.textSecondary }]}>Favorite</Text>
          </Pressable>

          <Pressable
            onPress={() => toggleLearned(currentPhrase.id)}
            style={[styles.iconButton, { borderColor: palette.border }]}
          >
            <Text style={{ fontSize: 20 }}>{isLearned ? '✓' : '○'}</Text>
            <Text style={[typography.caption, { color: palette.textSecondary }]}>
              {isLearned ? 'Learned' : 'Mark learned'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setReportVisible(true)}
            style={[styles.iconButton, { borderColor: palette.border }]}
          >
            <Text style={{ fontSize: 20 }}>⚑</Text>
            <Text style={[typography.caption, { color: palette.textSecondary }]}>Report</Text>
          </Pressable>
        </View>

        <PrimaryButton label="Show me another phrase" onPress={nextPhrase} style={styles.nextButton} />
      </ScrollView>

      <ReportIssueModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={reason => {
          reportPhrase(currentPhrase.id, reason);
          setReportVisible(false);
        }}
      />
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
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  iconButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nextButton: {
    marginTop: 28,
  },
});
