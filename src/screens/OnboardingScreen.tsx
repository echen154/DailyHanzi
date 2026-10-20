import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { OptionList } from '../components/OptionList';
import { HskMultiSelect } from '../components/HskMultiSelect';
import { PrimaryButton } from '../components/PrimaryButton';
import { FREQUENCY_OPTIONS, FrequencyMinutes, DEFAULT_SETTINGS } from '../types/settings';
import { LevelFilter } from '../types/phrase';
import { useAppStore } from '../store/useAppStore';

type Step = 'welcome' | 'level' | 'frequency' | 'widget';

// Frequency and the Lock Screen widget only mean anything on iOS — Android
// has no widget surface at all (no Lock Screen widget API exists on
// Android, and this app deliberately has no Home Screen widget on either
// platform), so those steps are skipped there entirely rather than asking
// the user to configure something with no effect.
const STEPS: Step[] = Platform.OS === 'ios' ? ['welcome', 'level', 'frequency', 'widget'] : ['welcome', 'level'];

export function OnboardingScreen() {
  const { palette } = useTheme();
  const completeOnboarding = useAppStore(s => s.completeOnboarding);
  const [stepIndex, setStepIndex] = useState(0);
  const [level, setLevel] = useState<LevelFilter>('mixed');
  const [frequency, setFrequency] = useState<FrequencyMinutes>(DEFAULT_SETTINGS.frequencyMinutes);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'welcome' && (
          <View style={styles.stepBody}>
            <Text style={styles.hero}>你好</Text>
            <Text style={[typography.title, { color: palette.textPrimary }]}>Daily Hanzi</Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              {Platform.OS === 'ios'
                ? 'A new Chinese phrase appears right on your Lock Screen, every few hours — no app to open, nothing to study. Just glance and learn.'
                : 'A new Chinese phrase, with pinyin and an English definition, every time you open the app. Simple, focused, no clutter.'}
            </Text>
          </View>
        )}

        {step === 'level' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              What's your level?
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              We'll only show phrases that match. Pick "Mixed" or check any combination of levels
              — you can change this anytime in Settings.
            </Text>
            <View style={styles.optionSpacing}>
              <HskMultiSelect value={level} onChange={setLevel} />
            </View>
          </View>
        )}

        {step === 'frequency' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              How often?
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              This sets how often the Lock Screen widget refreshes with a new phrase.
            </Text>
            <View style={styles.optionSpacing}>
              <OptionList options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </View>
          </View>
        )}

        {step === 'widget' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              Add it to your Lock Screen
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              Touch and hold your Lock Screen, tap Customize, then Lock Screen, then tap a widget
              area and search for "Daily Hanzi". You can do this now or later — the app works
              either way.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={isLastStep ? "I'm ready" : 'Continue'}
          onPress={() => {
            if (!isLastStep) {
              setStepIndex(stepIndex + 1);
              return;
            }
            completeOnboarding(level, frequency);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stepBody: {
    paddingVertical: 24,
  },
  hero: {
    fontSize: 64,
    fontWeight: '600',
    marginBottom: 16,
  },
  copy: {
    marginTop: 12,
  },
  optionSpacing: {
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
});
