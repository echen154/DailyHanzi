import { create } from 'zustand';
import { ALL_PHRASES, getPhraseById } from '../data/phrases';
import { Phrase } from '../types/phrase';
import { Settings, DEFAULT_SETTINGS, FrequencyMinutes } from '../types/settings';
import { UserData, EMPTY_USER_DATA } from '../types/state';
import { loadSettings, saveSettings } from '../storage/settingsRepository';
import { loadUserData, saveUserData } from '../storage/userDataRepository';
import {
  withHistoryEntry,
  withToggledFavorite,
  withToggledLearned,
  withMergedWidgetHistory,
} from '../storage/userDataOperations';
import { selectNextPhrase } from '../engine/phraseSelector';
import { WidgetBridge } from '../native/WidgetBridge';

const RECENT_IDS_FOR_WIDGET = 30;

interface AppState {
  isLoading: boolean;
  settings: Settings;
  userData: UserData;
  currentPhrase: Phrase | null;

  initialize: () => Promise<void>;
  /** Pulls in phrases the widget showed on its own since the last sync (iOS Lock Screen widget only). */
  refreshFromWidget: () => Promise<void>;
  nextPhrase: () => Promise<void>;
  toggleFavorite: (phraseId: string) => Promise<void>;
  toggleLearned: (phraseId: string) => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  completeOnboarding: (hskLevel: Settings['hskLevel'], frequencyMinutes: FrequencyMinutes) => Promise<void>;
}

/**
 * Folds in phrases the widget displayed on its own since the last time the
 * app checked (iOS Lock Screen widget only — a no-op on Android, which has
 * no widget at all). Returns the same object reference when there's nothing
 * new, so callers can skip redundant writes.
 */
async function mergeWidgetOriginatedChanges(userData: UserData): Promise<UserData> {
  const widgetEntries = await WidgetBridge.getWidgetHistory();
  return widgetEntries.length > 0 ? withMergedWidgetHistory(userData, widgetEntries, Date.now()) : userData;
}

function syncWidget(settings: Settings, userData: UserData) {
  const recentIds = [...userData.history]
    .sort((a, b) => b.shownAt - a.shownAt)
    .slice(0, RECENT_IDS_FOR_WIDGET)
    .map(h => h.phraseId);

  WidgetBridge.syncState({
    settings: {
      hskLevel: settings.hskLevel,
      frequencyMinutes: settings.frequencyMinutes,
      scriptMode: settings.scriptMode,
      showPinyin: settings.showPinyin,
      showDefinition: settings.showDefinition,
      activeHoursStart: settings.activeHoursStart,
      activeHoursEnd: settings.activeHoursEnd,
      widgetEnabled: settings.widgetEnabled,
    },
    favoriteIds: userData.favoriteIds,
    learnedIds: userData.learnedIds,
    recentIds,
    currentPhraseId: userData.currentPhraseId,
  });
  WidgetBridge.reloadWidgets();
}

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: true,
  settings: DEFAULT_SETTINGS,
  userData: EMPTY_USER_DATA,
  currentPhrase: null,

  initialize: async () => {
    const [settings, storedUserData] = await Promise.all([loadSettings(), loadUserData()]);
    const userData = await mergeWidgetOriginatedChanges(storedUserData);

    let currentPhrase = userData.currentPhraseId ? getPhraseById(userData.currentPhraseId) ?? null : null;
    let finalUserData = userData;

    if (!currentPhrase) {
      const picked = selectNextPhrase({
        phrases: ALL_PHRASES,
        level: settings.hskLevel,
        history: userData.history,
        favoriteIds: userData.favoriteIds,
        learnedIds: userData.learnedIds,
      });
      if (picked) {
        finalUserData = withHistoryEntry(userData, picked.id, Date.now());
        currentPhrase = picked;
      }
    }

    if (finalUserData !== storedUserData) {
      await saveUserData(finalUserData);
    }

    set({ settings, userData: finalUserData, currentPhrase, isLoading: false });
    syncWidget(settings, finalUserData);
  },

  refreshFromWidget: async () => {
    const { settings, userData } = get();
    const merged = await mergeWidgetOriginatedChanges(userData);
    if (merged === userData) return;
    set({ userData: merged });
    await saveUserData(merged);
    syncWidget(settings, merged);
  },

  nextPhrase: async () => {
    const { settings, userData } = get();
    const picked = selectNextPhrase({
      phrases: ALL_PHRASES,
      level: settings.hskLevel,
      history: userData.history,
      favoriteIds: userData.favoriteIds,
      learnedIds: userData.learnedIds,
      excludeId: userData.currentPhraseId,
    });
    if (!picked) return;

    const nextUserData = withHistoryEntry(userData, picked.id, Date.now());
    set({ userData: nextUserData, currentPhrase: picked });
    await saveUserData(nextUserData);
    syncWidget(settings, nextUserData);
  },

  toggleFavorite: async (phraseId: string) => {
    const { settings, userData } = get();
    const nextUserData = withToggledFavorite(userData, phraseId);
    set({ userData: nextUserData });
    await saveUserData(nextUserData);
    syncWidget(settings, nextUserData);
  },

  toggleLearned: async (phraseId: string) => {
    const { userData } = get();
    const nextUserData = withToggledLearned(userData, phraseId);
    set({ userData: nextUserData });
    await saveUserData(nextUserData);
  },

  updateSettings: async (partial: Partial<Settings>) => {
    const { settings, userData } = get();
    const nextSettings = { ...settings, ...partial };
    set({ settings: nextSettings });
    await saveSettings(nextSettings);
    syncWidget(nextSettings, userData);
  },

  completeOnboarding: async (hskLevel, frequencyMinutes) => {
    const { settings } = get();
    const nextSettings = { ...settings, hskLevel, frequencyMinutes, hasCompletedOnboarding: true };
    set({ settings: nextSettings });
    await saveSettings(nextSettings);
    await get().nextPhrase();
    syncWidget(nextSettings, get().userData);
  },
}));
