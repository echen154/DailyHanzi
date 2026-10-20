import { NativeModules } from 'react-native';
import { Settings } from '../types/settings';
import { HistoryEntry } from '../types/state';

/**
 * Bridge to the native widget support module.
 *
 * iOS only: ios/DailyHanzi/DailyHanziWidgetBridge.swift (+ .m exporter),
 * backed by an App Group shared UserDefaults suite that the WidgetKit
 * extension (a Lock Screen widget — see ios/DailyHanziWidget/) reads from
 * directly. There is no Android counterpart: Android has no Lock Screen
 * widget API (removed in Android 5.0 and never restored), and this app
 * deliberately has no Home Screen widget on either platform, so on Android
 * `NativeModules.DailyHanziWidgetBridge` is simply undefined and every
 * method below no-ops — the app works the same either way, just without a
 * home-screen/lock-screen surface on Android.
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
