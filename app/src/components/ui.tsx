import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dur, enter, exit, HIT, space, type } from '@/design/system';
import { Depth } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { font, LADDER, rank } from '@/design/tokens';
import { fx } from '@/sound/sfx';
import { TileNum } from './TileNum';

/* ---------- screen shell ---------- */

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: ins.top + space.sm,
        paddingBottom: ins.bottom + space.lg,
        paddingLeft: Math.max(space.lg, ins.left),
        paddingRight: Math.max(space.lg, ins.right),
      }}>
      <View style={[{ flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center' }, style]}>{children}</View>
    </View>
  );
}

/* ---------- type ---------- */

/** Section label and small captions: 14 medium, muted. */
export function Label({ children, style, meta }: { children: ReactNode; style?: TextStyle; meta?: boolean }) {
  const { c } = useTheme();
  return <Text style={[meta ? type.meta : type.secondaryStrong, { color: c.muted }, style]}>{children}</Text>;
}

export function Body({ children, style, muted, small }: { children: ReactNode; style?: TextStyle; muted?: boolean; small?: boolean }) {
  const { c } = useTheme();
  return <Text style={[small ? type.secondary : type.body, { color: muted ? c.muted : c.text }, style]}>{children}</Text>;
}

export function Heading({ children, level = 'title', style }: { children: ReactNode; level?: 'title' | 'heading'; style?: TextStyle }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole="header" style={[type[level], { color: c.text }, style]}>
      {children}
    </Text>
  );
}

/* ---------- wordmark ---------- */

/** The mark: the menu poster in miniature. */
export function Glyph({ size = 16 }: { size?: number }) {
  const { c, depth, isDark } = useTheme();
  const S = size;
  const L = Math.max(2, Math.round(S * 0.08));
  const v1 = Math.round(S * 0.62);
  const hl = Math.round(S * 0.6);
  const hr = Math.round(S * 0.38);
  const vs = Math.round(S * 0.22);
  const hb = Math.round(S * 0.78);
  const box = (l: number, t: number, w: number, h: number, bg: string, open?: { t?: boolean; r?: boolean; b?: boolean; l?: boolean }) => (
    <View style={{ position: 'absolute', left: l, top: t, width: w, height: h, backgroundColor: bg, overflow: 'hidden' }}>
      {open ? <Depth kind={depth} fill={bg} open={open} size={S * 0.3} dark={isDark} /> : null}
    </View>
  );
  return (
    <View style={{ width: S, height: S, backgroundColor: c.bg, borderWidth: L, borderColor: c.line, overflow: 'hidden' }}>
      {box(v1 + L, 0, S, hr, c.tile[2], { l: true, b: true })}
      {box(0, hl + L, vs, S - hl - L * 3, c.tile[3], { t: true, r: true, b: true })}
      {box(v1 + L, hb + L, S, S - hb - L * 3, c.tile[1], { t: true, l: true, b: true })}
      {box(v1, 0, L, S, c.line)}
      {box(0, hl, v1, L, c.line)}
      {box(v1, hr, S, L, c.line)}
      {box(vs, hl, L, S, c.line)}
      {box(v1, hb, S, L, c.line)}
    </View>
  );
}

export function Wordmark({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.4) }}>
      <Glyph size={Math.round(size * 1.1)} />
      <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, color: c.text, includeFontPadding: false }}>
        blockhaus
      </Text>
    </View>
  );
}

/* ---------- buttons ---------- */

type BtnProps = {
  label: string;
  onPress?: () => void;
  /** primary: ink fill. secondary: L1 surface with a hairline. ghost: text only.
      danger: secondary with red text, for destructive steps. */
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'md' | 'lg';
  disabled?: boolean;
  /** Right-aligned extra, e.g. the score on Continue. */
  trailing?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, kind = 'secondary', size = 'md', disabled, trailing, style, accessibilityLabel }: BtnProps) {
  const { c, isDark, depth } = useTheme();
  const k = kind === 'outline' ? 'secondary' : kind;
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ opacity: 1 - press.value * 0.25 }));
  const primary = k === 'primary';
  const bg = primary ? (isDark ? c.text : c.line) : k === 'ghost' ? 'transparent' : c.surface;
  const fg = primary ? c.bg : k === 'danger' ? c.tile[2] : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        fx.tap();
        onPress?.();
      }}
      onPressIn={() => (press.value = withTiming(1, enter(dur.fast)))}
      onPressOut={() => (press.value = withTiming(0, exit(dur.fast)))}
      style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      <Animated.View
        style={[
          {
            minHeight: size === 'lg' ? 56 : 48,
            paddingHorizontal: space.lg,
            borderWidth: k === 'ghost' || primary ? 0 : 1,
            borderColor: c.hair,
            backgroundColor: bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: trailing ? 'space-between' : 'center',
          },
          face,
        ]}>
        {primary ? <Depth kind={depth} fill={bg} open={{ t: true, r: true, b: true, l: true }} size={44} dark={isDark} /> : null}
        <Text style={[type.bodyStrong, { color: fg }]}>{label}</Text>
        {trailing ? <Text style={[type.bodyStrong, { color: fg, opacity: 0.7, fontVariant: ['tabular-nums'] }]}>{trailing}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

/** A text row that behaves as a button: 44 tall, for secondary navigation. */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        fx.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={{ minHeight: HIT, justifyContent: 'center' }}>
      {({ pressed }) => <Text style={[type.bodyStrong, { color: c.text, opacity: pressed ? 0.6 : 1 }]}>{label}</Text>}
    </Pressable>
  );
}

/** Square icon button, 44×44. Children draw the icon; the label is spoken. */
export function IconButton({
  onPress,
  label,
  children,
  disabled,
  plain,
  quiet,
  size = HIT,
}: {
  onPress?: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
  /** No tap sound: the action plays its own. */
  quiet?: boolean;
  /** No surface: for top bars. */
  plain?: boolean;
  /** Side of the square; never under HIT. */
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={() => {
        if (!quiet) fx.tap();
        onPress?.();
      }}
      disabled={disabled}
      style={({ pressed }) => ({
        width: Math.max(HIT, size),
        height: Math.max(HIT, size),
        borderWidth: plain ? 0 : 1,
        borderColor: c.hair,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: plain ? 'transparent' : c.surface,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
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
  const t = Math.max(2, Math.round(s * 0.14));
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
  const t = Math.max(2, Math.round(s * 0.14));
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

/* ---------- ladder: the legend of rungs ---------- */

export function Ladder({ best, size = 24, animate }: { best: number; size?: number; animate?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }} accessibilityLabel="Лесенка плиток">
      {LADDER.map((v, k) => {
        const on = v <= 2 || v <= best;
        const rk = rank(v);
        return (
          <Rung key={v} delay={animate ? k * 50 : undefined}>
            <View
              style={{
                minWidth: size,
                height: size,
                paddingHorizontal: space.xs,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.tile[rk] : 'transparent',
                borderWidth: on ? 0 : 1,
                borderColor: c.hair,
              }}>
              <TileNum v={v} color={on ? c.ink[rk] : c.faint} size={Math.max(12, Math.round(size * 0.5))} />
            </View>
          </Rung>
        );
      })}
    </View>
  );
}

function Rung({ children, delay }: { children: ReactNode; delay?: number }) {
  const s = useSharedValue(delay === undefined ? 1 : 0);
  useEffect(() => {
    if (delay !== undefined) s.value = withDelay(delay, withTiming(1, enter()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ translateY: (1 - s.value) * 4 }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** A tile-coloured badge with a value, e.g. best tile. */
export function TileBadge({ v, size = 24 }: { v: number; size?: number }) {
  const { c } = useTheme();
  if (!v) return <Text style={[type.bodyStrong, { color: c.text }]}>—</Text>;
  const rk = rank(v);
  return (
    <View style={{ minWidth: size + space.sm, height: size, paddingHorizontal: space.xs, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center' }}>
      <TileNum v={v} color={c.ink[rk]} size={Math.max(12, Math.round(size * 0.55))} />
    </View>
  );
}

/* ---------- settings controls ---------- */

/** A switch: ink track when on, hairline track when off. 44 tall hit area. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, enter(dur.fast));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        onChange(!value);
        // After the change, so switching sound on is heard and switching it off is not.
        setTimeout(() => fx.toggle(!value), 50);
      }}
      style={{ height: HIT, justifyContent: 'center' }}>
      <View style={{ width: 48, height: 28, backgroundColor: value ? c.text : c.surface, borderWidth: 1, borderColor: value ? c.text : c.hair }}>
        <Animated.View
          style={[{ position: 'absolute', left: 3, top: 3, width: 20, height: 20, backgroundColor: value ? c.bg : c.faint }, knob]}
        />
      </View>
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
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.hair, backgroundColor: c.surface, padding: space.xs, gap: space.xs }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              fx.tap();
              onChange(o.value);
            }}
            style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.text : 'transparent' }}>
            <Text style={[type.secondaryStrong, { color: on ? c.bg : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- a dialog card: L2, hairline plus a soft shadow ---------- */

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.hair,
          padding: space.xl,
          shadowColor: c.shadow,
          shadowOpacity: 1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/* ---------- top bar for pushed screens ---------- */

export function TopBar({ title, onBack, close }: { title: string; onBack: () => void; close?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg, marginLeft: -space.md }}>
      <IconButton plain label={close ? 'Закрыть' : 'Назад'} onPress={onBack}>
        {close ? <CloseIcon color={c.text} s={16} /> : <Arrow dir="left" color={c.text} s={18} />}
      </IconButton>
      <Heading level="heading">{title}</Heading>
    </View>
  );
}

/** A settings-style row: label and note on the left, a control on the right. */
export function Row({ label, note, children, onPress }: { label: string; note?: string; children?: ReactNode; onPress?: () => void }) {
  const { c } = useTheme();
  const inner = (pressed = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm, opacity: pressed ? 0.6 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { color: c.text }]}>{label}</Text>
        {note ? <Text style={[type.secondary, { color: c.muted }]}>{note}</Text> : null}
      </View>
      {children ?? (onPress ? <Arrow dir="right" color={c.muted} s={14} /> : null)}
    </View>
  );
  if (!onPress) return inner();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        fx.tap();
        onPress();
      }}>
      {({ pressed }) => inner(pressed)}
    </Pressable>
  );
}

/** A hairline divider. */
export function Rule() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.hair }} />;
}

/** A small stat: meta label over a number. */
export function Stat({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.xs, alignItems: 'flex-start' }}>
      <Label meta>{label}</Label>
      {children ?? <Text style={[type.stat, { color: c.text }]}>{value}</Text>}
    </View>
  );
}
