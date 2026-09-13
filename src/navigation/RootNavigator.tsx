import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MainTabs } from './MainTabs';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';

export function RootNavigator() {
  const hasCompletedOnboarding = useAppStore(s => s.settings.hasCompletedOnboarding);
  const { palette, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.background,
      card: palette.surface,
      border: palette.border,
      text: palette.textPrimary,
      primary: palette.accent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {hasCompletedOnboarding ? <MainTabs /> : <OnboardingScreen />}
    </NavigationContainer>
  );
}
