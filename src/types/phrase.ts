/**
 * Core data model for a single Chinese phrase/word entry.
 * This shape is intentionally flat and JSON-serializable so the exact same
 * dataset can be bundled into the RN app, the iOS widget extension, and the
 * Android widget module without any transformation step.
 */
export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The user-facing difficulty filter. 'mixed' removes the HSK filter
 * entirely; an array lets the user opt into any combination of levels
 * (e.g. [2, 3] to study HSK 2 and 3 phrases together).
 */
export type LevelFilter = HskLevel[] | 'mixed';

export interface Phrase {
  /** Stable, unique identifier. Never reuse or renumber across releases. */
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  definition: string;
  exampleSentence: string;
  exampleSentencePinyin: string;
  exampleSentenceTranslation: string;
  hskLevel: HskLevel;
  topic: string;
  tags: string[];
}

export type ScriptMode = 'simplified' | 'traditional';

/** Returns the Chinese text to display for the user's script preference. */
export function chineseText(phrase: Phrase, script: ScriptMode): string {
  return script === 'traditional' ? phrase.traditional : phrase.simplified;
}
