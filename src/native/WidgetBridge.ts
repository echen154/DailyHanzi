import { NativeModules } from 'react-native';
import { Settings } from '../types/settings';
import { HistoryEntry } from '../types/state';

/**
 * Bridge to the native widget support module.
 *
 * There is one native implementation per platform:
 *  - iOS: ios/DailyHanzi/DailyHanziWidgetBridge.swift (+ .m exporter), backed
 *    by an App Group shared UserDefaults suite that the WidgetKit extension
 *    reads from directly.
 *  - Android: android/app/.../widget/DailyHanziWidgetBridgeModule.kt, backed
 *    by a SharedPreferences file the AppWidgetProvider/WorkManager worker
 *    read directly (Android widgets run in the same process as the app, so
 *    no App-Group-style container is needed).
 *
 * Both expose the exact same three methods, so this file is the only place
 * JS needs to know about the native bridge at all.
 */

export interface WidgetSettingsSnapshot {
  hskLevel: Settings['hskLevel'];
  frequencyMinutes: Settings['frequencyMinutes'];
  scriptMode: Settings['scriptMode'];
  showPinyin: boolean;
  showDefinition: boolean;
  activeHoursStart: number;
  activeHoursEnd: number;
  widgetEnabled: boolean;
}

export interface WidgetSyncPayload {
  settings: WidgetSettingsSnapshot;
  favoriteIds: string[];
  learnedIds: string[];
  /** Most-recently-shown phrase ids first, used by native code for the same cooldown logic as the JS engine. */
  recentIds: string[];
  currentPhraseId: string | null;
}

interface NativeWidgetBridge {
  syncState(payloadJson: string): void;
  reloadWidgets(): void;
  getWidgetHistory(): Promise<{ phraseId: string; shownAt: number }[]>;
}

const native = NativeModules.DailyHanziWidgetBridge as NativeWidgetBridge | undefined;

export const WidgetBridge = {
  /** False in environments where the native module hasn't been linked (e.g. a bare JS unit test run). */
  isAvailable(): boolean {
    return native != null;
  },

  /** Publishes the latest settings/favorites/history snapshot for native widget code to read. */
  syncState(payload: WidgetSyncPayload): void {
    if (!native) return;
    try {
      native.syncState(JSON.stringify(payload));
    } catch (err) {
      console.warn('[WidgetBridge] syncState failed', err);
    }
  },

  /** Asks the OS to refresh the widget immediately (best-effort; see platform docs for real constraints). */
  reloadWidgets(): void {
    if (!native) return;
    try {
      native.reloadWidgets();
    } catch (err) {
      console.warn('[WidgetBridge] reloadWidgets failed', err);
    }
  },

  /** Pulls phrases the widget chose on its own while the app was closed, so History stays complete. */
  async getWidgetHistory(): Promise<HistoryEntry[]> {
    if (!native) return [];
    try {
      return await native.getWidgetHistory();
    } catch (err) {
      console.warn('[WidgetBridge] getWidgetHistory failed', err);
      return [];
    }
  },
};
