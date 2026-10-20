import { UserData, MAX_HISTORY_ENTRIES, HistoryEntry } from '../types/state';

/** Pure helpers over UserData. No I/O here, which keeps them trivial to unit test. */

export function withHistoryEntry(data: UserData, phraseId: string, now: number): UserData {
  const history = [{ phraseId, shownAt: now }, ...data.history].slice(0, MAX_HISTORY_ENTRIES);
  return {
    ...data,
    history,
    currentPhraseId: phraseId,
    currentPhraseShownAt: now,
  };
}

export function withToggledFavorite(data: UserData, phraseId: string): UserData {
  const isFavorite = data.favoriteIds.includes(phraseId);
  return {
    ...data,
    favoriteIds: isFavorite
      ? data.favoriteIds.filter(id => id !== phraseId)
      : [...data.favoriteIds, phraseId],
  };
}

export function withToggledLearned(data: UserData, phraseId: string): UserData {
  const isLearned = data.learnedIds.includes(phraseId);
  return {
    ...data,
    learnedIds: isLearned
      ? data.learnedIds.filter(id => id !== phraseId)
      : [...data.learnedIds, phraseId],
  };
}

/**
 * Merges phrases the native widget selected on its own (while the app wasn't
 * running) into local history, so the History screen reflects the full
 * passive-learning experience rather than only in-app taps. Entries are
 * deduped by (phraseId, shownAt) pair.
 */
export function withMergedWidgetHistory(
  data: UserData,
  widgetEntries: HistoryEntry[],
  syncedAt: number,
): UserData {
  if (widgetEntries.length === 0) {
    return { ...data, lastWidgetSyncAt: syncedAt };
  }
  const existingKeys = new Set(data.history.map(h => `${h.phraseId}:${h.shownAt}`));
  const newOnes = widgetEntries.filter(h => !existingKeys.has(`${h.phraseId}:${h.shownAt}`));
  const merged = [...newOnes, ...data.history]
    .sort((a, b) => b.shownAt - a.shownAt)
    .slice(0, MAX_HISTORY_ENTRIES);

  const mostRecent = merged[0];
  return {
    ...data,
    history: merged,
    lastWidgetSyncAt: syncedAt,
    currentPhraseId: mostRecent ? mostRecent.phraseId : data.currentPhraseId,
    currentPhraseShownAt: mostRecent ? mostRecent.shownAt : data.currentPhraseShownAt,
  };
}
