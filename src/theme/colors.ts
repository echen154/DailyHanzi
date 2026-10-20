export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  onAccent: string;
}

export const lightPalette: Palette = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8E5DE',
  textPrimary: '#1C1B19',
  textSecondary: '#5B5952',
  textTertiary: '#8B887F',
  accent: '#B3453A',
  accentSoft: '#F3E3DB',
  danger: '#C4432E',
  onAccent: '#FFFFFF',
};

export const darkPalette: Palette = {
  background: '#121211',
  surface: '#1C1C1A',
  surfaceElevated: '#242422',
  border: '#33322E',
  textPrimary: '#F3F1EB',
  textSecondary: '#B7B4AB',
  textTertiary: '#807D74',
  accent: '#E08A74',
  accentSoft: '#2E201B',
  danger: '#E8947A',
  onAccent: '#2A140F',
};
