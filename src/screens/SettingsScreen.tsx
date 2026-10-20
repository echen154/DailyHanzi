import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useAppStore } from '../store/useAppStore';
import { OptionList } from '../components/OptionList';
import { HskMultiSelect } from '../components/HskMultiSelect';
import { FREQUENCY_OPTIONS } from '../types/settings';

const ACTIVE_HOURS_PRESETS: { value: string; label: string; start: number; end: number }[] = [
  { value: 'all-day', label: 'All day (24 hours)', start: 0, end: 24 },
  { value: 'early', label: '7 AM – 11 PM', start: 7, end: 23 },
  { value: 'standard', label: '8 AM – 10 PM', start: 8, end: 22 },
  { value: 'work-hours', label: '9 AM – 6 PM', start: 9, end: 18 },
];

function activeHoursPresetValue(start: number, end: number): string {
  const match = ACTIVE_HOURS_PRESETS.find(p => p.start === start && p.end === end);
  return match ? match.value : 'standard';
}

function SectionLabel({ children }: { children: string }) {
  const { palette } = useTheme();
  return <Text style={[typography.caption, styles.sectionLabel, { color: palette.textTertiary }]}>{children}</Text>;
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.toggleRow, { borderColor: palette.border }]}>
      <View style={styles.toggleText}>
        <Text style={[typography.body, { color: palette.textPrimary }]}>{label}</Text>
        {description && (
          <Text style={[typography.caption, { color: palette.textTertiary, marginTop: 2 }]}>{description}</Text>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export function SettingsScreen() {
  const { palette } = useTheme();
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.title, { color: palette.textPrimary }]}>Settings</Text>

        <SectionLabel>CHINESE LEVEL</SectionLabel>
        <Text style={[typography.caption, styles.footnote, { color: palette.textTertiary, marginTop: 0, marginBottom: 10 }]}>
          Pick "Mixed" for every level, or check any combination of levels to study together.
        </Text>
        <HskMultiSelect value={settings.hskLevel} onChange={value => updateSettings({ hskLevel: value })} />

        {Platform.OS === 'ios' && (
          <>
            <SectionLabel>PHRASE FREQUENCY</SectionLabel>
            <OptionList
              options={FREQUENCY_OPTIONS}
              value={settings.frequencyMinutes}
              onChange={value => updateSettings({ frequencyMinutes: value })}
            />
            <Text style={[typography.caption, styles.footnote, { color: palette.textTertiary }]}>
              iOS batches Lock Screen widget refreshes for battery life, so updates land close to — but not
              always exactly at — this interval.
            </Text>
          </>
        )}

        <SectionLabel>DISPLAY</SectionLabel>
        {Platform.OS === 'ios' && (
          <ToggleRow
            label="Lock Screen widget"
            description="Turn off to stop the widget from refreshing"
            value={settings.widgetEnabled}
            onChange={value => updateSettings({ widgetEnabled: value })}
          />
        )}
        <ToggleRow
          label="Traditional Chinese"
          description="Show traditional characters instead of simplified"
          value={settings.scriptMode === 'traditional'}
          onChange={value => updateSettings({ scriptMode: value ? 'traditional' : 'simplified' })}
        />
        <ToggleRow
          label="Show pinyin"
          value={settings.showPinyin}
          onChange={value => updateSettings({ showPinyin: value })}
        />
        <ToggleRow
          label="Show English definition"
          value={settings.showDefinition}
          onChange={value => updateSettings({ showDefinition: value })}
        />

        {Platform.OS === 'ios' && (
          <>
            <SectionLabel>ACTIVE HOURS</SectionLabel>
            <Text
              style={[typography.caption, styles.footnote, { color: palette.textTertiary, marginTop: 0, marginBottom: 10 }]}
            >
              The Lock Screen widget only refreshes with a new phrase during these hours, so you won't get
              one at 3 AM.
            </Text>
            <OptionList
              options={ACTIVE_HOURS_PRESETS.map(p => ({ value: p.value, label: p.label }))}
              value={activeHoursPresetValue(settings.activeHoursStart, settings.activeHoursEnd)}
              onChange={value => {
                const preset = ACTIVE_HOURS_PRESETS.find(p => p.value === value);
                if (preset) updateSettings({ activeHoursStart: preset.start, activeHoursEnd: preset.end });
              }}
            />
          </>
        )}

        <SectionLabel>APPEARANCE</SectionLabel>
        <OptionList
          options={[
            { value: 'system', label: 'Match system' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={settings.theme}
          onChange={value => updateSettings({ theme: value })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    flex: 1,
    paddingRight: 12,
  },
  footnote: {
    marginTop: 10,
  },
});
