export interface HistoryEntry {
  phraseId: string;
  shownAt: number; // epoch millis
}

export interface UserData {
  history: HistoryEntry[];
  favoriteIds: string[];
  learnedIds: string[];
  currentPhraseId: string | null;
  currentPhraseShownAt: number | null;
  /** Epoch millis of the last time we pulled "shown while app was closed" entries from the widget. */
  lastWidgetSyncAt: number;
}

export const EMPTY_USER_DATA: UserData = {
  history: [],
  favoriteIds: [],
  learnedIds: [],
  currentPhraseId: null,
  currentPhraseShownAt: null,
  lastWidgetSyncAt: 0,
};

/** How many history entries we keep around locally. Older ones are trimmed. */
export const MAX_HISTORY_ENTRIES = 500;
