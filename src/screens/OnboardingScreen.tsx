import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { OptionList } from '../components/OptionList';
import { PrimaryButton } from '../components/PrimaryButton';
import { HSK_OPTIONS, FREQUENCY_OPTIONS, FrequencyMinutes } from '../types/settings';
import { LevelFilter } from '../types/phrase';
import { useAppStore } from '../store/useAppStore';

type Step = 'welcome' | 'level' | 'frequency' | 'widget';

export function OnboardingScreen() {
  const { palette } = useTheme();
  const completeOnboarding = useAppStore(s => s.completeOnboarding);
  const [step, setStep] = useState<Step>('welcome');
  const [level, setLevel] = useState<LevelFilter>('mixed');
  const [frequency, setFrequency] = useState<FrequencyMinutes>(240);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'welcome' && (
          <View style={styles.stepBody}>
            <Text style={styles.hero}>你好</Text>
            <Text style={[typography.title, { color: palette.textPrimary }]}>Daily Hanzi</Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              A new Chinese phrase appears right on your home screen, every few hours — no app to
              open, nothing to study. Just glance and learn.
            </Text>
          </View>
        )}

        {step === 'level' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              What's your level?
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              We'll only show phrases that match. You can change this anytime in Settings.
            </Text>
            <View style={styles.optionSpacing}>
              <OptionList options={HSK_OPTIONS} value={level} onChange={setLevel} />
            </View>
          </View>
        )}

        {step === 'frequency' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              How often?
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              This sets how often the home-screen widget refreshes with a new phrase.
            </Text>
            <View style={styles.optionSpacing}>
              <OptionList options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </View>
          </View>
        )}

        {step === 'widget' && (
          <View style={styles.stepBody}>
            <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>
              Add the widget
            </Text>
            <Text style={[typography.body, styles.copy, { color: palette.textSecondary }]}>
              Long-press your home screen, tap the + button, and search for "Daily Hanzi" to add
              the widget. You can do this now or later — the app works either way.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={step === 'widget' ? "I'm ready" : 'Continue'}
          onPress={() => {
            if (step === 'welcome') setStep('level');
            else if (step === 'level') setStep('frequency');
            else if (step === 'frequency') setStep('widget');
            else completeOnboarding(level, frequency);
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
