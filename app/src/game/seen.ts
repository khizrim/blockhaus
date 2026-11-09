import AsyncStorage from '@react-native-async-storage/async-storage';

/* How many times the player has watched each sweep moment play out in full
   (2026-11-09). A stud's trip (from a chain, from a new tray, off a full
   key, out on a swipe) is a big, slow moment while it still has something
   to teach; after LOUD showings outside the lessons it plays small and
   quick, so the game does not keep shouting what the player knows. */

export type StudKind = 'chain' | 'tray' | 'full' | 'spend';
const KEY = 'blockhaus:studSeen';
const LOUD = 2;
const counts: Record<StudKind, number> = { chain: 0, tray: 0, full: 0, spend: 0 };

AsyncStorage.getItem(KEY)
  .then((raw) => raw && Object.assign(counts, JSON.parse(raw)))
  .catch(() => {});

/** Should this moment play in full? Counts the showing if so. */
export function loudOnce(kind: StudKind): boolean {
  if (counts[kind] >= LOUD) return false;
  counts[kind]++;
  AsyncStorage.setItem(KEY, JSON.stringify(counts)).catch(() => {});
  return true;
}
