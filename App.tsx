/**
 * Daily Hanzi
 * Passive Chinese-learning app with a home-screen widget.
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
import { WidgetBridge } from './src/native/WidgetBridge';
import { withMergedWidgetHistory } from './src/storage/userDataOperations';
import { saveUserData } from './src/storage/userDataRepository';

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
    initialize();
  }, [initialize]);

  // Every time the app comes back to the foreground, pull in any phrases the
  // native widget selected on its own while we were closed, so History stays
  // a complete record of the passive-learning experience.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      const cameToForeground = appStateRef.current.match(/inactive|background/) && nextState === 'active';
      appStateRef.current = nextState;
      if (!cameToForeground) return;

      const widgetEntries = await WidgetBridge.getWidgetHistory();
      if (widgetEntries.length === 0) return;

      const { userData } = useAppStore.getState();
      const merged = withMergedWidgetHistory(userData, widgetEntries, Date.now());
      useAppStore.setState({ userData: merged });
      await saveUserData(merged);
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
