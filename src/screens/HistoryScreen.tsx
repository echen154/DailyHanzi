import React, { useMemo } from 'react';
import { Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useAppStore } from '../store/useAppStore';
import { getPhraseById } from '../data/phrases';
import { Phrase } from '../types/phrase';
import { HistoryEntry } from '../types/state';
import { PhraseListRow } from '../components/PhraseListRow';
import { EmptyState } from '../components/EmptyState';

function formatRelativeTime(shownAt: number): string {
  const diffMs = Date.now() - shownAt;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function HistoryScreen() {
  const { palette } = useTheme();
  const history = useAppStore(s => s.userData.history);
  const scriptMode = useAppStore(s => s.settings.scriptMode);

  const rows = useMemo(() => {
    const result: { entry: HistoryEntry; phrase: Phrase }[] = [];
    for (const entry of history) {
      const phrase = getPhraseById(entry.phraseId);
      if (phrase) result.push({ entry, phrase });
    }
    return result;
  }, [history]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[typography.title, styles.heading, { color: palette.textPrimary }]}>History</Text>
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          message="Phrases you encounter — in the app or on your widget — will show up here."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => `${row.phrase.id}-${row.entry.shownAt}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PhraseListRow
              phrase={item.phrase}
              scriptMode={scriptMode}
              subtitle={formatRelativeTime(item.entry.shownAt)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
