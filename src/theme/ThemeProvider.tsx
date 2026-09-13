import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightPalette, darkPalette, Palette } from './colors';
import { ThemePreference } from '../types/settings';

interface ThemeContextValue {
  palette: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: lightPalette,
  isDark: false,
});

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const value = useMemo(
    () => ({ palette: isDark ? darkPalette : lightPalette, isDark }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
