import { HskLevel, LevelFilter, ScriptMode } from './phrase';

/**
 * Refresh cadence for the iOS Lock Screen widget, expressed in minutes.
 * These are the only options exposed in Settings; they map directly onto
 * WidgetKit's timeline spacing (see PhraseTimelineProvider.swift). Android
 * has no widget to apply this to — see WidgetBridge.ts.
 */
export type FrequencyMinutes = 60 | 120 | 240 | 360 | 1440;

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  hskLevel: LevelFilter;
  frequencyMinutes: FrequencyMinutes;
  scriptMode: ScriptMode;
  showPinyin: boolean;
  showDefinition: boolean;
  /** Hour of day (0-23, local time) the widget should start refreshing. */
  activeHoursStart: number;
  /** Hour of day (0-23, local time) the widget should stop refreshing. */
  activeHoursEnd: number;
  widgetEnabled: boolean;
  theme: ThemePreference;
  hasCompletedOnboarding: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  hskLevel: 'mixed',
  frequencyMinutes: 240,
  scriptMode: 'simplified',
  showPinyin: true,
  showDefinition: true,
  activeHoursStart: 8,
  activeHoursEnd: 22,
  widgetEnabled: true,
  theme: 'system',
  hasCompletedOnboarding: false,
};

export const FREQUENCY_OPTIONS: { value: FrequencyMinutes; label: string }[] = [
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 240, label: 'Every 4 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Once per day' },
];

/** Individual selectable rows for the HSK level picker — not a `LevelFilter` itself, since a filter can combine several of these. */
export const HSK_OPTIONS: { value: HskLevel | 'mixed'; label: string }[] = [
  { value: 1, label: 'HSK 1' },
  { value: 2, label: 'HSK 2' },
  { value: 3, label: 'HSK 3' },
  { value: 4, label: 'HSK 4' },
  { value: 5, label: 'HSK 5' },
  { value: 6, label: 'HSK 6' },
  { value: 'mixed', label: 'Mixed / All levels' },
];
