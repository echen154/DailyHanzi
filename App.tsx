/**
 * Daily Hanzi
 * Chinese-learning app with an iOS Lock Screen widget for passive learning.
 *
 * @format
 */

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/useAppStore';

function LoadingScreen() {
  const { palette } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: palette.background }]}>
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}

function AppContent() {
  const isLoading = useAppStore(s => s.isLoading);
  const initialize = useAppStore(s => s.initialize);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) ?? 'active');

  useEffect(() => {
    initialize().catch(err => {
      console.error('[DailyHanzi] initialize() failed:', err);
    });
  }, [initialize]);

  // Every time the app comes back to the foreground, pull in anything the
  // native widget did on its own while we were closed — phrases it selected
  // (History stays a complete record) and "mark learned" taps made directly
  // on the widget — so the app never shows stale state.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      const cameToForeground = appStateRef.current.match(/inactive|background/) && nextState === 'active';
      appStateRef.current = nextState;
      if (!cameToForeground) return;
      await useAppStore.getState().refreshFromWidget();
    });
    return () => subscription.remove();
  }, []);

  if (isLoading) return <LoadingScreen />;
  return <RootNavigator />;
}

function App() {
  const theme = useAppStore(s => s.settings.theme);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider preference={theme}>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
