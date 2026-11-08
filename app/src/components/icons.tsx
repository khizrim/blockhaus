import Svg, { Circle, Path } from 'react-native-svg';

/* The icon pack (2026-11-08): every icon is drawn on one 24-point grid with
   one rounded stroke, 2.4 points wide, round caps and joins, no fills, two
   points of air on every side. They read as moulded into the plastic keys
   and share the rounded strokes of the lesson's formula signs. */

export type IconName = 'pause' | 'sweep' | 'sound' | 'mute' | 'gear' | 'back' | 'close' | 'chevron' | 'up' | 'down';

const STROKE = 2.4;

function cog(): string {
  // Eight teeth around the wheel: an outline that steps out and in.
  const pts: string[] = [];
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const w = Math.PI / n;
    const at = (r: number, d: number) => `${(12 + r * Math.cos(a + d)).toFixed(2)} ${(12 + r * Math.sin(a + d)).toFixed(2)}`;
    pts.push(at(7, -w * 0.95), at(9.6, -w * 0.45), at(9.6, w * 0.45), at(7, w * 0.95));
  }
  return `M${pts.join('L')}Z`;
}

const PATHS: Record<IconName, string> = {
  pause: 'M8.5 5.5V18.5M15.5 5.5V18.5',
  sweep: 'M12 3.5V20.5M3.5 12H20.5M9 6.5L12 3.5L15 6.5M9 17.5L12 20.5L15 17.5M6.5 9L3.5 12L6.5 15M17.5 9L20.5 12L17.5 15',
  sound: 'M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4Z M15.5 9.5C16.3 10.2 16.7 11.1 16.7 12C16.7 12.9 16.3 13.8 15.5 14.5M18 7C19.5 8.3 20.3 10.1 20.3 12C20.3 13.9 19.5 15.7 18 17',
  mute: 'M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4Z M16 9.5L21 14.5M21 9.5L16 14.5',
  gear: cog(),
  back: 'M19.5 12H5M10.5 6L4.5 12L10.5 18',
  close: 'M6 6L18 18M18 6L6 18',
  chevron: 'M9.5 6L15.5 12L9.5 18',
  up: 'M6 15L12 9L18 15',
  down: 'M6 9L12 15L18 9',
};

export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {name === 'gear' ? <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={STROKE} fill="none" /> : null}
    </Svg>
  );
}
