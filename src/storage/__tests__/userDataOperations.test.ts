import {
  withHistoryEntry,
  withToggledFavorite,
  withToggledLearned,
  withMergedWidgetHistory,
} from '../userDataOperations';
import { EMPTY_USER_DATA, MAX_HISTORY_ENTRIES } from '../../types/state';

describe('withHistoryEntry', () => {
  it('records the phrase as current and prepends it to history', () => {
    const result = withHistoryEntry(EMPTY_USER_DATA, 'p1', 1000);
    expect(result.currentPhraseId).toBe('p1');
    expect(result.currentPhraseShownAt).toBe(1000);
    expect(result.history).toEqual([{ phraseId: 'p1', shownAt: 1000 }]);
  });

  it('caps history at MAX_HISTORY_ENTRIES, dropping the oldest', () => {
    let data = EMPTY_USER_DATA;
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 10; i++) {
      data = withHistoryEntry(data, `p${i}`, i);
    }
    expect(data.history).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(data.history[0].phraseId).toBe(`p${MAX_HISTORY_ENTRIES + 9}`);
    expect(data.history.some(h => h.phraseId === 'p0')).toBe(false);
  });
});

describe('withToggledFavorite', () => {
  it('adds a phrase to favorites when not already favorited', () => {
    const result = withToggledFavorite(EMPTY_USER_DATA, 'p1');
    expect(result.favoriteIds).toContain('p1');
  });

  it('removes a phrase from favorites when already favorited', () => {
    const withFav = withToggledFavorite(EMPTY_USER_DATA, 'p1');
    const withoutFav = withToggledFavorite(withFav, 'p1');
    expect(withoutFav.favoriteIds).not.toContain('p1');
  });
});

describe('withToggledLearned', () => {
  it('toggles membership in learnedIds', () => {
    const marked = withToggledLearned(EMPTY_USER_DATA, 'p1');
    expect(marked.learnedIds).toContain('p1');
    const unmarked = withToggledLearned(marked, 'p1');
    expect(unmarked.learnedIds).not.toContain('p1');
  });
});

describe('withMergedWidgetHistory', () => {
  it('merges new widget-originated entries into history and updates the current phrase', () => {
    const base = withHistoryEntry(EMPTY_USER_DATA, 'app-phrase', 100);
    const result = withMergedWidgetHistory(
      base,
      [{ phraseId: 'widget-phrase', shownAt: 500 }],
      600,
    );
    expect(result.history[0]).toEqual({ phraseId: 'widget-phrase', shownAt: 500 });
    expect(result.currentPhraseId).toBe('widget-phrase');
    expect(result.currentPhraseShownAt).toBe(500);
    expect(result.lastWidgetSyncAt).toBe(600);
  });

  it('deduplicates entries already present in history', () => {
    const base = withHistoryEntry(EMPTY_USER_DATA, 'p1', 100);
    const result = withMergedWidgetHistory(base, [{ phraseId: 'p1', shownAt: 100 }], 200);
    expect(result.history).toHaveLength(1);
  });

  it('advances lastWidgetSyncAt even when there is nothing new to merge', () => {
    const result = withMergedWidgetHistory(EMPTY_USER_DATA, [], 999);
    expect(result.lastWidgetSyncAt).toBe(999);
    expect(result.history).toHaveLength(0);
  });
});
