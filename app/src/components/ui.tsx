import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';
import { font, LADDER, rank } from '@/design/tokens';

/* ---------- screen shell ---------- */

export function Screen({ children, style, center }: { children: ReactNode; style?: ViewStyle; center?: boolean }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: c.bg,
          paddingTop: ins.top + 12,
          paddingBottom: ins.bottom + 16,
          paddingLeft: Math.max(16, ins.left),
          paddingRight: Math.max(16, ins.right),
        },
        center && { alignItems: 'center' },
      ]}>
      <View style={[{ flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center' }, style]}>{children}</View>
    </View>
  );
}

/* ---------- type ---------- */

export function Label({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { c } = useTheme();
  return (
    <Text
      allowFontScaling={false}
      style={[{ fontFamily: font.bodyMedium, fontSize: 13, color: c.muted }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, muted }: { children: ReactNode; style?: TextStyle; muted?: boolean }) {
  const { c } = useTheme();
  return (
    <Text style={[{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: muted ? c.muted : c.text }, style]}>
      {children}
    </Text>
  );
}

export function Heading({ children, size = 26, style }: { children: ReactNode; size?: number; style?: TextStyle }) {
  const { c } = useTheme();
  return (
    <Text allowFontScaling={false} style={[{ fontFamily: font.wide, fontSize: size, color: c.text, letterSpacing: -0.3 }, style]}>
      {children}
    </Text>
  );
}

/* ---------- wordmark ---------- */

/** The mark: the menu poster in miniature. Two lines cross off-centre; blue,
    red and yellow take the corners, the way the poster does at full size. */
export function Glyph({ size = 16 }: { size?: number }) {
  const { c, isDark } = useTheme();
  const S = size;
  const L = Math.max(2, Math.round(S * 0.11));
  const vx = Math.round(S * 0.62);
  const hy = Math.round(S * 0.4);
  const bx = Math.round(S * 0.24);
  const yb = Math.round(S * 0.78);
  const field = isDark ? '#1C1D21' : '#F3EFE4';
  const box = (l: number, t: number, w: number, h: number, bg: string) => (
    <View style={{ position: 'absolute', left: l, top: t, width: w, height: h, backgroundColor: bg }} />
  );
  return (
    <View style={{ width: S, height: S, backgroundColor: field, borderWidth: L / 2, borderColor: c.line, overflow: 'hidden' }}>
      {box(0, 0, bx, hy, c.tile[1])}
      {box(vx + L, 0, S, hy, c.tile[2])}
      {box(vx + L, hy + L, S, yb - hy - L, c.tile[3])}
      {box(vx, 0, L, S, c.line)}
      {box(0, hy, S, L, c.line)}
      {box(bx, 0, L, hy, c.line)}
      {box(vx, yb, S, L, c.line)}
    </View>
  );
}

export function Wordmark({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.45 }}>
      <Glyph size={Math.round(size * 1.15)} />
      <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, letterSpacing: -0.3, color: c.text, includeFontPadding: false }}>
        blockhaus
      </Text>
    </View>
  );
}

/* ---------- buttons ---------- */

type BtnProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'outline' | 'ghost' | 'danger';
  /** Tile colour for a primary button, by rung. Default: ink. */
  tone?: number;
  size?: 'md' | 'lg';
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

/** Square-cornered, 2px ink outline. Primary fills; presses push the face down 2px
    over a hard offset shadow, like a block being set into place. */
export function Button({ label, onPress, kind = 'outline', tone, size = 'md', disabled, icon, style }: BtnProps) {
  const { c } = useTheme();
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 3 }] }));
  const lg = size === 'lg';
  const bg =
    kind === 'primary' ? (tone ? c.tile[tone] : c.line) : kind === 'danger' ? c.tile[2] : kind === 'ghost' ? 'transparent' : c.canvas;
  const fg = kind === 'primary' ? (tone ? c.ink[tone] : c.tile[3]) : kind === 'danger' ? '#FFFFFF' : c.text;
  const hasShadow = kind !== 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 60 }))}
      onPressOut={() => (press.value = withSpring(0, { damping: 12, stiffness: 400 }))}
      style={[{ opacity: disabled ? 0.35 : 1 }, style]}>
      {hasShadow ? (
        <View style={[StyleSheet.absoluteFill, { top: 3, bottom: -3, backgroundColor: c.line }]} />
      ) : null}
      <Animated.View
        style={[
          {
            minHeight: lg ? 58 : 46,
            paddingHorizontal: lg ? 22 : 16,
            borderWidth: kind === 'ghost' ? 0 : 2,
            borderColor: c.stroke,
            backgroundColor: bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          },
          face,
        ]}>
        {icon}
        <Text
          allowFontScaling={false}
          style={{
            color: fg,
            fontFamily: lg ? font.wide : font.bodySemi,
            fontSize: lg ? 17 : 15,
            letterSpacing: lg ? 0 : 0.2,
            textDecorationLine: kind === 'ghost' ? 'underline' : 'none',
          }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Square icon button. Children draw the icon. */
export function IconButton({
  onPress,
  label,
  children,
  size = 40,
  disabled,
}: {
  onPress?: () => void;
  label: string;
  children: ReactNode;
  size?: number;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: c.text,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.text : 'transparent',
        opacity: disabled ? 0.3 : 1,
      })}>
      {children}
    </Pressable>
  );
}

/* ---------- icons, drawn from blocks ---------- */

export function PauseIcon({ color, s = 14 }: { color: string; s?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: s * 0.28 }}>
      <View style={{ width: s * 0.3, height: s, backgroundColor: color }} />
      <View style={{ width: s * 0.3, height: s, backgroundColor: color }} />
    </View>
  );
}

export function Arrow({ dir, color, s = 16 }: { dir: 'left' | 'right' | 'up' | 'down'; color: string; s?: number }) {
  const rot = { right: '0deg', down: '90deg', left: '180deg', up: '270deg' }[dir];
  const t = Math.max(2, s * 0.14);
  return (
    <View style={{ width: s, height: s, transform: [{ rotate: rot }] }}>
      <View style={{ position: 'absolute', left: 0, right: t * 0.6, top: (s - t) / 2, height: t, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          right: t * 0.35,
          top: s * 0.5 - s * 0.32,
          width: s * 0.45,
          height: s * 0.45,
          borderRightWidth: t,
          borderTopWidth: t,
          borderColor: color,
          transform: [{ translateY: s * 0.09 }, { rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function CloseIcon({ color, s = 16 }: { color: string; s?: number }) {
  const t = Math.max(2, s * 0.14);
  const bar = (r: string) => (
    <View style={{ position: 'absolute', left: -s * 0.1, right: -s * 0.1, top: (s - t) / 2, height: t, backgroundColor: color, transform: [{ rotate: r }] }} />
  );
  return (
    <View style={{ width: s, height: s }}>
      {bar('45deg')}
      {bar('-45deg')}
    </View>
  );
}

/* ---------- ladder: the legend and the progress ---------- */

export function Ladder({ best, size = 20, animate }: { best: number; size?: number; animate?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessibilityLabel="Merge ladder">
      {LADDER.map((v, k) => {
        const on = v <= 2 || v <= best;
        const rk = rank(v);
        return (
          <View key={v} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {k === 1 ? <Op>+</Op> : k >= 2 ? <Op>›</Op> : null}
            <Rung delay={animate ? k * 60 : undefined}>
              <View
                style={{
                  minWidth: size,
                  height: size,
                  paddingHorizontal: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? c.tile[rk] : 'transparent',
                  borderWidth: on ? 0 : 1.5,
                  borderColor: c.faint,
                }}>
                <Text
                  allowFontScaling={false}
                  style={{ fontFamily: font.tile, fontSize: size * 0.5, color: on ? c.ink[rk] : c.faint }}>
                  {v}
                </Text>
              </View>
            </Rung>
          </View>
        );
      })}
    </View>
  );
}

function Op({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ color: c.faint, fontSize: 10, fontFamily: font.bodySemi }}>{children}</Text>;
}

function Rung({ children, delay }: { children: ReactNode; delay?: number }) {
  const s = useSharedValue(delay === undefined ? 1 : 0);
  useEffect(() => {
    if (delay !== undefined) s.value = withDelay(delay, withSpring(1, { damping: 12 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** A tile-coloured badge with a value, e.g. best tile. */
export function TileBadge({ v, size = 24 }: { v: number; size?: number }) {
  const { c } = useTheme();
  if (!v) {
    return <Text style={{ fontFamily: font.tile, fontSize: size * 0.6, color: c.text }}>—</Text>;
  }
  const rk = rank(v);
  return (
    <View style={{ minWidth: size * 1.25, height: size, paddingHorizontal: 5, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ fontFamily: font.tile, fontSize: size * 0.58, color: c.ink[rk] }}>
        {v}
      </Text>
    </View>
  );
}

/* ---------- settings controls ---------- */

/** A switch made of two cells: off is a hollow cell, on fills it with the rung colour. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 260 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 24 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 52, height: 28, backgroundColor: value ? c.tile[1] : c.canvas, borderWidth: 2, borderColor: c.stroke }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 24, height: 24, backgroundColor: c.line }, knob]} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: c.stroke, backgroundColor: c.stroke, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.tile[3] : c.canvas }}>
            <Text style={{ fontFamily: font.bodySemi, fontSize: 14, color: on ? c.ink[3] : c.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- a modal card: the thick frame of the board around a canvas panel ---------- */

export function Panel({ children, style, accent }: { children: ReactNode; style?: ViewStyle; accent?: number }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.line, padding: 6 }, style]}>
      {accent ? <View style={{ height: 14, backgroundColor: c.tile[accent], marginBottom: 6 }} /> : null}
      <View style={{ backgroundColor: c.canvas, padding: 22 }}>{children}</View>
    </View>
  );
}

/* ---------- top bar for pushed screens ---------- */

export function TopBar({ title, onBack, close }: { title: string; onBack: () => void; close?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      <IconButton label={close ? 'Close' : 'Back'} onPress={onBack} size={38}>
        {close ? <CloseIcon color={c.text} s={14} /> : <Arrow dir="left" color={c.text} s={16} />}
      </IconButton>
      <Heading size={20}>{title}</Heading>
    </View>
  );
}
