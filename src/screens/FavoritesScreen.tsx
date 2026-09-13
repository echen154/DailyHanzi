import React, { useMemo } from 'react';
import { Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useAppStore } from '../store/useAppStore';
import { getPhraseById } from '../data/phrases';
import { PhraseListRow } from '../components/PhraseListRow';
import { EmptyState } from '../components/EmptyState';

export function FavoritesScreen() {
  const { palette } = useTheme();
  const favoriteIds = useAppStore(s => s.userData.favoriteIds);
  const scriptMode = useAppStore(s => s.settings.scriptMode);

  const phrases = useMemo(
    () =>
      favoriteIds
        .map(id => getPhraseById(id))
        .filter((p): p is NonNullable<ReturnType<typeof getPhraseById>> => p != null)
        .reverse(),
    [favoriteIds],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[typography.title, styles.heading, { color: palette.textPrimary }]}>Favorites</Text>
      {phrases.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          message="Tap the star on any phrase to save it here for quick review."
        />
      ) : (
        <FlatList
          data={phrases}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <PhraseListRow phrase={item} scriptMode={scriptMode} />}
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
