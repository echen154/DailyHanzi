import {
  selectNextPhrase,
  filterByLevel,
  recentlyShownIds,
} from '../phraseSelector';
import { Phrase } from '../../../src/types/phrase';
import { HistoryEntry } from '../../../src/types/state';

function makePhrase(id: string, hskLevel: 1 | 2 | 3 | 4 | 5 | 6): Phrase {
  return {
    id,
    simplified: id,
    traditional: id,
    pinyin: id,
    definition: id,
    exampleSentence: '',
    exampleSentencePinyin: '',
    exampleSentenceTranslation: '',
    hskLevel,
    topic: 'Test',
    tags: [],
  };
}

const hsk1 = ['a1', 'a2', 'a3', 'a4', 'a5'].map(id => makePhrase(id, 1));
const hsk2 = ['b1', 'b2', 'b3'].map(id => makePhrase(id, 2));
const allPhrases = [...hsk1, ...hsk2];

/** Deterministic RNG sequence for reproducible weighted-pick tests. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('filterByLevel', () => {
  it('restricts the pool to a single HSK level', () => {
    const result = filterByLevel(allPhrases, [2]);
    expect(result.map(p => p.id).sort()).toEqual(['b1', 'b2', 'b3']);
  });

  it('restricts the pool to any combination of selected HSK levels', () => {
    const result = filterByLevel(allPhrases, [1, 2]);
    expect(result).toHaveLength(allPhrases.length);
  });

  it('returns nothing when the level array is empty', () => {
    expect(filterByLevel(allPhrases, [])).toHaveLength(0);
  });

  it('returns every phrase for "mixed"', () => {
    expect(filterByLevel(allPhrases, 'mixed')).toHaveLength(allPhrases.length);
  });
});

describe('recentlyShownIds', () => {
  it('keeps only the N most recent distinct ids', () => {
    const history: HistoryEntry[] = [
      { phraseId: 'a1', shownAt: 1 },
      { phraseId: 'a2', shownAt: 2 },
      { phraseId: 'a3', shownAt: 3 },
    ];
    const result = recentlyShownIds(history, 2);
    expect(result.has('a3')).toBe(true);
    expect(result.has('a2')).toBe(true);
    expect(result.has('a1')).toBe(false);
  });
});

describe('selectNextPhrase - difficulty filtering', () => {
  it('never returns a phrase outside the selected HSK level', () => {
    for (let trial = 0; trial < 25; trial++) {
      const phrase = selectNextPhrase({
        phrases: allPhrases,
        level: [1],
        history: [],
        favoriteIds: [],
        learnedIds: [],
        random: () => trial / 25,
      });
      expect(phrase?.hskLevel).toBe(1);
    }
  });

  it('draws from every selected level when multiple HSK levels are chosen', () => {
    const seen = new Set<string>();
    for (let trial = 0; trial < 40; trial++) {
      const phrase = selectNextPhrase({
        phrases: allPhrases,
        level: [1, 2],
        history: [],
        favoriteIds: [],
        learnedIds: [],
        random: () => trial / 40,
      });
      if (phrase) seen.add(phrase.id);
    }
    expect([...seen].some(id => id.startsWith('a'))).toBe(true);
    expect([...seen].some(id => id.startsWith('b'))).toBe(true);
  });

  it('draws from the whole pool when level is "mixed"', () => {
    const seen = new Set<string>();
    for (let trial = 0; trial < 40; trial++) {
      const phrase = selectNextPhrase({
        phrases: allPhrases,
        level: 'mixed',
        history: [],
        favoriteIds: [],
        learnedIds: [],
        random: () => trial / 40,
      });
      if (phrase) seen.add(phrase.id);
    }
    expect([...seen].some(id => id.startsWith('a'))).toBe(true);
    expect([...seen].some(id => id.startsWith('b'))).toBe(true);
  });

  it('returns null when no phrase matches the level', () => {
    const phrase = selectNextPhrase({
      phrases: allPhrases,
      level: [6],
      history: [],
      favoriteIds: [],
      learnedIds: [],
    });
    expect(phrase).toBeNull();
  });
});

describe('selectNextPhrase - avoiding recent repeats', () => {
  it('excludes phrases shown within the cooldown window when alternatives exist', () => {
    const history: HistoryEntry[] = [
      { phraseId: 'a1', shownAt: 5 },
      { phraseId: 'a2', shownAt: 4 },
      { phraseId: 'a3', shownAt: 3 },
    ];
    for (let trial = 0; trial < 30; trial++) {
      const phrase = selectNextPhrase({
        phrases: hsk1,
        level: [1],
        history,
        favoriteIds: [],
        learnedIds: [],
        random: () => trial / 30,
      });
      expect(['a1', 'a2', 'a3']).not.toContain(phrase?.id);
    }
  });

  it('never immediately repeats the currently displayed phrase when alternatives exist', () => {
    for (let trial = 0; trial < 30; trial++) {
      const phrase = selectNextPhrase({
        phrases: hsk1,
        level: [1],
        history: [],
        favoriteIds: [],
        learnedIds: [],
        excludeId: 'a1',
        random: () => trial / 30,
      });
      expect(phrase?.id).not.toBe('a1');
    }
  });

  it('falls back gracefully when the pool is too small to keep excluding', () => {
    const single = [makePhrase('only', 1)];
    const phrase = selectNextPhrase({
      phrases: single,
      level: [1],
      history: [{ phraseId: 'only', shownAt: 1 }],
      favoriteIds: [],
      learnedIds: [],
      excludeId: 'only',
    });
    expect(phrase?.id).toBe('only');
  });

  it('allows repetition once every phrase has cycled through recently (reinforcement)', () => {
    // With a 5-item pool, cooldown covers 3 items (60%); after all 5 appear in
    // history the two oldest fall outside the cooldown window and become
    // eligible again rather than the algorithm being permanently stuck.
    const history: HistoryEntry[] = [
      { phraseId: 'a5', shownAt: 5 },
      { phraseId: 'a4', shownAt: 4 },
      { phraseId: 'a3', shownAt: 3 },
      { phraseId: 'a2', shownAt: 2 },
      { phraseId: 'a1', shownAt: 1 },
    ];
    const phrase = selectNextPhrase({
      phrases: hsk1,
      level: [1],
      history,
      favoriteIds: [],
      learnedIds: [],
      random: () => 0,
    });
    expect(['a1', 'a2']).toContain(phrase?.id);
  });
});

describe('selectNextPhrase - favorites and reinforcement weighting', () => {
  it('gives favorites a larger share of the weighted range than non-favorites', () => {
    // Pool of 2 phrases, neither shown before (so the "unseen" bonus applies
    // equally to both and cancels out of the ratio), one favorited. Favorite
    // weight 1.5 vs 1.0 means the favorite should occupy 60% of the range.
    const pool = [makePhrase('fav', 1), makePhrase('plain', 1)];
    const pickAt = (r: number) =>
      selectNextPhrase({
        phrases: pool,
        level: [1],
        history: [],
        favoriteIds: ['fav'],
        learnedIds: [],
        random: sequence(r),
      })?.id;

    expect(pickAt(0.0)).toBe('fav');
    expect(pickAt(0.5)).toBe('fav');
    expect(pickAt(0.9)).toBe('plain');
  });

  it('reduces (but does not eliminate) the chance of showing learned phrases', () => {
    const pool = [makePhrase('learned', 1), makePhrase('new', 1)];
    const pickAt = (r: number) =>
      selectNextPhrase({
        phrases: pool,
        level: [1],
        history: [],
        favoriteIds: [],
        learnedIds: ['learned'],
        random: sequence(r),
      })?.id;

    // learned=0.5 weight, new=1.0 weight => learned occupies [0, 1/3)
    expect(pickAt(0.1)).toBe('learned');
    expect(pickAt(0.5)).toBe('new');
  });
});
