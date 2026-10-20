import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from '../settingsRepository';
import { DEFAULT_SETTINGS, Settings } from '../../types/settings';

describe('settingsRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults when nothing has been saved yet', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('persists settings and reloads the same values', async () => {
    const updated: Settings = { ...DEFAULT_SETTINGS, hskLevel: [3], frequencyMinutes: 60 };
    await saveSettings(updated);
    const reloaded = await loadSettings();
    expect(reloaded).toEqual(updated);
  });

  it('merges saved data onto current defaults, so a future app update that adds a field never crashes', async () => {
    // Simulate an older, smaller settings blob missing a field this version expects.
    const legacyBlob = { hskLevel: [2], frequencyMinutes: 120 };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(legacyBlob));

    const reloaded = await loadSettings();
    expect(reloaded.hskLevel).toEqual([2]);
    expect(reloaded.frequencyMinutes).toBe(120);
    expect(reloaded.showPinyin).toBe(DEFAULT_SETTINGS.showPinyin);
    expect(reloaded.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('falls back to defaults if the stored value is corrupt JSON', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{not valid json');
    const reloaded = await loadSettings();
    expect(reloaded).toEqual(DEFAULT_SETTINGS);
  });
});
