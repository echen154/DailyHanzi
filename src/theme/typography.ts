import { Platform } from 'react-native';

/**
 * A typography-first system tuned for one job: make the Chinese characters
 * the loudest thing on screen, pinyin clearly secondary, and English
 * definitions readable but visually quiet.
 */
export const typography = {
  hanzi: {
    /** The hero display for the phrase itself. */
    fontSize: 56,
    lineHeight: 68,
    fontWeight: '600' as const,
  },
  hanziCompact: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '600' as const,
  },
  pinyin: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  definition: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  example: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  // iOS renders CJK text a hair small next to Latin text at the same
  // fontSize; nudging up the Chinese-bearing styles keeps proportions
  // consistent across platforms.
  platformHanziBoost: Platform.select({ ios: 1, android: 0, default: 0 }),
};
