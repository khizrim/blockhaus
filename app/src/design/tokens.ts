/* Design tokens, carried over from prototype/index.html.

   The board reads as a Mondrian composition. Tiles of the same value that
   touch form one "field", a single block of colour. Between fields runs a
   thick black gap; inside a field only a thin fold marks where one cell ends
   and the next begins, so a field still counts cell by cell. Empty space is a
   field too.

   Colour encodes the rung: primaries for 1, 2, 3 (the tiles that cover most of
   the board), secondaries for the rarer rungs above. */

export type Palette = {
  bg: string; // the wall the panel hangs on
  canvas: string; // empty field
  line: string; // thick gaps between fields
  stroke: string; // outlines of controls: ink on light, chalk on dark
  fold: string; // thin folds inside a field
  text: string;
  muted: string;
  faint: string;
  scrim: string;
  /** Tile fill and number colour per rung, index 1..8. */
  tile: string[];
  ink: string[];
};

export const light: Palette = {
  bg: '#E8E5DE',
  canvas: '#F6F4EF',
  line: '#111215',
  stroke: '#111215',
  fold: 'rgba(17,18,21,0.2)',
  text: '#111215',
  muted: '#5D5F66',
  faint: '#9A9BA0',
  scrim: 'rgba(232,229,222,0.86)',
  tile: ['', '#1F4FB2', '#D9342B', '#F4C21C', '#EC7A1F', '#1D8657', '#6B3DA3', '#D9468C', '#0E8C97'],
  ink: ['', '#FFFFFF', '#FFFFFF', '#111215', '#111215', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
};

export const dark: Palette = {
  bg: '#141518',
  canvas: '#26282D',
  line: '#050506',
  stroke: '#EEEDEA',
  fold: 'rgba(0,0,0,0.35)',
  text: '#EEEDEA',
  muted: '#A2A3A8',
  faint: '#66686E',
  scrim: 'rgba(20,21,24,0.88)',
  tile: ['', '#3466D6', '#E5463C', '#F2C230', '#F08A33', '#26A06A', '#8455C4', '#E25C9C', '#18A3AE'],
  ink: ['', '#FFFFFF', '#FFFFFF', '#111215', '#111215', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
};

export const LADDER = [1, 2, 3, 6, 12, 24, 48, 96] as const;
export const NAMES = ['', 'blue', 'red', 'yellow', 'orange', 'green', 'violet', 'magenta', 'teal'];

/** Rung of a value: 1→1, 2→2, 3→3, 6→4 … 96 and above → 8. Same as engine.rank. */
export function rank(v: number): number {
  if (v <= 0) return 0;
  if (v < 3) return v;
  let r = 3;
  let x = v;
  while (x > 3 && r < 8) {
    x /= 2;
    r++;
  }
  return r;
}

/** Does `a` pair with `b`? 1 goes with 2, from 3 up only equals. Visual only. */
export function pairs(a: number, b: number): boolean {
  if (!a || !b) return false;
  if (a + b === 3) return true;
  return a >= 3 && a === b;
}

export const font = {
  /** Dela Gothic One: the poster face. Wordmark, headings, big numbers. */
  wide: 'DelaGothicOne_400Regular',
  black: 'DelaGothicOne_400Regular',
  /** Archivo at 110% width, for numbers on tiles (the board keeps its face). */
  tile: 'ArchivoTile-ExtraBold',
  /** Archivo at 90% width, for 3-digit tiles. */
  narrow: 'ArchivoNarrow-ExtraBold',
  /** Onest for everything you read. Both faces carry Cyrillic. */
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
};

/** Mix colour `a` into `b` by `t` (0..1). Hex only. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

export const motion = {
  fast: 140,
  base: 220,
  slow: 420,
};
