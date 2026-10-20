import { Phrase } from '../types/phrase';
import raw from './phraseData.json';

/** The full bundled phrase database. Offline-first: no network fetch, ever. */
export const ALL_PHRASES: Phrase[] = raw as Phrase[];

export function getPhraseById(id: string): Phrase | undefined {
  return ALL_PHRASES.find(p => p.id === id);
}
