import { Phrase, LevelFilter } from '../types/phrase';
import { HistoryEntry } from '../types/state';

/**
 * Intelligent phrase selection.
 *
 * Goals (see product spec):
 *  - Only ever choose from phrases matching the user's HSK filter.
 *  - Avoid phrases seen very recently ("cooldown"), scaled to pool size so
 *    small pools (e.g. a single HSK level with few entries) don't stall out.
 *  - Still allow repetition over the long run, for reinforcement.
 *  - Favorites are weighted to appear somewhat more often, never exclusively.
 *  - Phrases never shown before get a small boost, to encourage full coverage
 *    of the level before the algorithm starts repeating.
 *
 * This is intentionally a simple weighted-random model rather than a queue or
 * strict round-robin, so it stays reasonable no matter how the user's
 * settings or history evolve. It is also the designated extension point for
 * a future spaced-repetition (SM-2 style) scheduler: `learnedIds` and
 * `history[].shownAt` already carry everything an SRS scorer would need
 * (last-seen timestamp, "learned" signal) without changing this function's
 * public contract.
 */

export interface SelectPhraseOptions {
  phrases: Phrase[];
  level: LevelFilter;
  history: HistoryEntry[];
  favoriteIds: string[];
  learnedIds: string[];
  /** Never select this id if any alternative exists (e.g. the phrase on screen right now). */
  excludeId?: string | null;
  /** Injectable RNG in [0, 1) for deterministic tests. Defaults to Math.random. */
  random?: () => number;
}

const FAVORITE_WEIGHT_MULTIPLIER = 1.5;
const LEARNED_WEIGHT_MULTIPLIER = 0.5;
const UNSEEN_WEIGHT_MULTIPLIER = 1.3;
const MAX_COOLDOWN_IDS = 30;

export function filterByLevel(phrases: Phrase[], level: LevelFilter): Phrase[] {
  if (level === 'mixed') return phrases;
  const levels = new Set(level);
  return phrases.filter(p => levels.has(p.hskLevel));
}

/** Most-recently-shown distinct phrase ids, most recent first. */
export function recentlyShownIds(history: HistoryEntry[], limit: number): Set<string> {
  const seen = new Set<string>();
  const sorted = [...history].sort((a, b) => b.shownAt - a.shownAt);
  for (const entry of sorted) {
    if (seen.size >= limit) break;
    seen.add(entry.phraseId);
  }
  return seen;
}

function cooldownSize(poolSize: number): number {
  // Leave at least one candidate always eligible; scale with pool size so a
  // 20-phrase HSK level doesn't repeat for a long stretch, but a filtered
  // pool of 2-3 phrases can still cycle.
  const scaled = Math.floor(poolSize * 0.6);
  return Math.max(0, Math.min(MAX_COOLDOWN_IDS, Math.min(scaled, poolSize - 1)));
}

export function selectNextPhrase(options: SelectPhraseOptions): Phrase | null {
  const {
    phrases,
    level,
    history,
    favoriteIds,
    learnedIds,
    excludeId = null,
    random = Math.random,
  } = options;

  const pool = filterByLevel(phrases, level);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const cooldown = recentlyShownIds(history, cooldownSize(pool.length));
  const favorites = new Set(favoriteIds);
  const learned = new Set(learnedIds);
  const shownBefore = new Set(history.map(h => h.phraseId));

  let eligible = pool.filter(p => p.id !== excludeId && !cooldown.has(p.id));
  if (eligible.length === 0) {
    eligible = pool.filter(p => p.id !== excludeId);
  }
  if (eligible.length === 0) {
    eligible = pool;
  }

  const weights = eligible.map(p => {
    let w = 1;
    if (favorites.has(p.id)) w *= FAVORITE_WEIGHT_MULTIPLIER;
    if (learned.has(p.id)) w *= LEARNED_WEIGHT_MULTIPLIER;
    if (!shownBefore.has(p.id)) w *= UNSEEN_WEIGHT_MULTIPLIER;
    return w;
  });

  return weightedPick(eligible, weights, random);
}

function weightedPick<T>(items: T[], weights: number[], random: () => number): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = random() * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target <= 0) return items[i];
  }
  return items[items.length - 1];
}
