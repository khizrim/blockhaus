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
  /** L1 surface: controls, cards, the tray. */
  surface: string;
  /** Hairline border of an L1 surface. */
  hair: string;
  /** Soft shadow colour for L2 (cards over a scrim). */
  shadow: string;
  /** The white plastic plate the board is moulded in, and its bottom edge. */
  plate: string;
  plateEdge: string;
  /** Tile fill and number colour per rung, index 1..11. */
  tile: string[];
  ink: string[];
};

export const light: Palette = {
  // Plastic building tiles on a white plate (2026-11-08 redesign): the board
  // is a moulded plate with sunken sockets, every tile a glossy block.
  bg: '#ECEBE7',
  canvas: '#ECEAE4',
  line: '#2A2A2A',
  stroke: '#2A2A2A',
  fold: 'rgba(0,0,0,0.12)',
  text: '#2A2A2A',
  muted: '#77766F',
  faint: '#A3A29C',
  scrim: '#ECEBE7',
  surface: '#FFFFFF',
  hair: 'rgba(0,0,0,0.10)',
  shadow: 'rgba(0,0,0,0.08)',
  plate: '#FFFFFF',
  plateEdge: '#D3D1CA',
  // "Конструктор": 1 blue and 2 red are the magnet's poles; from 3 each rung
  // has its own toy colour, 384 is black with a yellow number, 768 gold.
  tile: ['', '#356BFF', '#FF4733', '#FFD43B', '#2FBF71', '#FF9F1C', '#FF5FA2', '#8F5BFF', '#17B5B0', '#22337F', '#1A1A1A', '#E8B923'],
  ink: ['', '#FFFFFF', '#FFFFFF', '#2A2A2A', '#2A2A2A', '#2A2A2A', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFD43B', '#2A2A2A'],
};

export const dark: Palette = {
  // Dark: a charcoal plate on a near-black table, the same plastic tiles.
  bg: '#18191C',
  canvas: '#23252A',
  line: '#EDEDEA',
  stroke: '#EDEDEA',
  fold: 'rgba(0,0,0,0.4)',
  text: '#EDEDEA',
  muted: '#9C9B96',
  faint: '#5E5F63',
  scrim: '#18191C',
  surface: '#2B2D33',
  hair: 'rgba(255,255,255,0.10)',
  shadow: 'rgba(0,0,0,0.3)',
  plate: '#2F3238',
  plateEdge: '#141518',
  tile: ['', '#356BFF', '#FF4733', '#FFD43B', '#2FBF71', '#FF9F1C', '#FF5FA2', '#8F5BFF', '#17B5B0', '#3A4FAF', '#0E0E0E', '#E8B923'],
  ink: ['', '#FFFFFF', '#FFFFFF', '#2A2A2A', '#2A2A2A', '#2A2A2A', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFD43B', '#2A2A2A'],
};

export const LADDER = [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768] as const;
export const NAMES = ['', 'blue', 'red', 'yellow', 'orange', 'green', 'violet', 'magenta', 'teal', 'umber', 'ink', 'indigo'];

/** Rung of a value: 1→1, 2→2, 3→3, 6→4 … 96 → 8, 192 → 9, 384 → 10, 768 and above → 11. Same as engine.rank. */
export function rank(v: number): number {
  if (v <= 0) return 0;
  if (v < 3) return v;
  let r = 3;
  let x = v;
  while (x > 3 && r < 11) {
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
  /** Rubik everywhere (2026-11-08): 700 for numbers and the wordmark, 400/500/600 for text. */
  wide: 'Rubik_700Bold',
  body: 'Rubik_400Regular',
  bodyMedium: 'Rubik_500Medium',
  bodySemi: 'Rubik_600SemiBold',
  /** Numbers: tiles, the score. One size in every tile, never shrunk for more digits. */
  tile: 'Rubik_700Bold',
  black: 'Rubik_700Bold',
  narrow: 'Rubik_600SemiBold',
};

/** Mix colour `a` into `b` by `t` (0..1). Hex only. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

