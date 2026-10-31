import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Field } from '@/components/Field';

/* ---------- A. The rule mark ----------
   The game's first rule, 1 + 2 = 3, said with its own pieces: a blue single,
   a red domino and a yellow L. One cell, two cells and three cells tile a
   3×2 block exactly, so the sum is also the shape. */

// Piece id per cell, row-major 3×2: R R Y / B Y Y
const RULE = [2, 2, 3, 1, 3, 3];

export function RuleMark({ cell, gap, drop = false }: { cell: number; gap: number; drop?: boolean }) {
  return (
    <View>
      <Field
        w={3}
        h={2}
        values={RULE}
        cell={cell}
        gap={gap}
        numbers={false}
        // 1 lands, then 2, then 3: the rule, read in order.
        look={drop ? (i) => ({ enterDelay: (RULE[i] - 1) * 260 }) : undefined}
      />
    </View>
  );
}

/** Small lockup size of the rule mark for headers. */
export function RuleGlyph({ size = 18 }: { size?: number }) {
  const cell = Math.round(size / 2);
  return <RuleMark cell={cell} gap={Math.max(2, Math.round(cell / 3))} />;
}

/* ---------- B. The cell word ----------
   "blockhaus" set in letters drawn on the board's own grid: each letter is a
   field, the paper around it is the empty field. 3×5 lowercase glyphs. */

const GLYPHS: Record<string, string[]> = {
  b: ['x..', 'x..', 'xxx', 'x.x', 'xxx'],
  l: ['x', 'x', 'x', 'x', 'x'],
  o: ['...', '...', 'xxx', 'x.x', 'xxx'],
  c: ['...', '...', 'xxx', 'x..', 'xxx'],
  k: ['x..', 'x..', 'x.x', 'xx.', 'x.x'],
  h: ['x..', 'x..', 'xxx', 'x.x', 'x.x'],
  a: ['...', '...', '.xx', 'x.x', 'xxx'],
  u: ['...', '...', 'x.x', 'x.x', 'xxx'],
  s: ['...', '...', '.xx', '.x.', 'xx.'],
};

export function cellWord(lines: string[], colours: number[][], pad = 1) {
  const rowsPerLine = 5;
  const widths = lines.map((l) => [...l].reduce((w, ch, k) => w + GLYPHS[ch][0].length + (k ? 1 : 0), 0));
  const w = Math.max(...widths) + pad * 2;
  const h = lines.length * rowsPerLine + (lines.length - 1) + pad * 2;
  const values: number[] = Array(w * h).fill(0);
  lines.forEach((line, li) => {
    let x0 = pad;
    const y0 = pad + li * (rowsPerLine + 1);
    [...line].forEach((ch, k) => {
      const g = GLYPHS[ch];
      g.forEach((row, y) =>
        [...row].forEach((m, x) => {
          if (m === 'x') values[(y0 + y) * w + x0 + x] = colours[li][k];
        }),
      );
      x0 += g[0].length + 1;
    });
  });
  return { w, h, values };
}

export const WORD = cellWord(['block', 'haus'], [
  [1, 2, 3, 1, 2],
  [3, 1, 2, 3],
]);

export function CellWord({ cell, gap, intro }: { cell: number; gap: number; intro?: boolean }) {
  return (
    <Field
      w={WORD.w}
      h={WORD.h}
      values={WORD.values}
      cell={cell}
      gap={gap}
      numbers={false}
      look={intro ? (i) => (WORD.values[i] ? { enterDelay: (i % WORD.w) * 28 + Math.floor(i / WORD.w) * 10 } : undefined) : undefined}
    />
  );
}

/* ---------- shared: a block that grows in from a corner ---------- */

export function Grow({
  children,
  delay = 0,
  from = 'left',
}: {
  children: React.ReactNode;
  delay?: number;
  from?: 'left' | 'top';
}) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 140 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() =>
    from === 'left'
      ? { transform: [{ scaleX: s.value }], transformOrigin: 'left' }
      : { transform: [{ scaleY: s.value }], transformOrigin: 'top' },
  );
  return <Animated.View style={st}>{children}</Animated.View>;
}

