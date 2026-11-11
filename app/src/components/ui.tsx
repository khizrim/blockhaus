import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dur, enter, exit, HIT, space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font, LADDER, rank } from '@/design/tokens';
import { fx } from '@/sound/sfx';
import { Block, Socket } from './Block';
import { Icon } from './icons';
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

/** The mark: one red plastic block, the one that ends the wordmark. */
export function Glyph({ size = 16 }: { size?: number }) {
  const { c } = useTheme();
  return <Block v={2} size={size} numbers={false} fill={c.tile[2]} />;
}

export function Wordmark({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Math.round(size * 0.12) }}>
      <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, letterSpacing: -0.045 * size, color: c.text, includeFontPadding: false }}>
        blockhaus
      </Text>
      <View style={{ marginBottom: Math.round(size * 0.16) }}>
        <Glyph size={Math.round(size * 0.7)} />
      </View>
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
  /** Right-aligned extra, e.g. the score on Continue, or a small mark. */
  trailing?: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/* A plastic key (2026-11-08): a rounded face standing on its own darker
   ledge. Pressed, the face goes down 3px onto the ledge. White for most
   keys, blue for the one step a page leads to. */
export function Key({
  children,
  onPress,
  blue,
  height = 48,
  width,
  disabled,
  quiet,
  label,
  style,
  faceStyle,
}: {
  children: ReactNode;
  onPress?: () => void;
  blue?: boolean;
  height?: number;
  width?: number | `${number}%`;
  disabled?: boolean;
  quiet?: boolean;
  label: string;
  style?: ViewStyle;
  faceStyle?: ViewStyle;
}) {
  const { c, isDark } = useTheme();
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 3 }] }));
  const LEDGE_H = 4;
  const r = 12;
  const top = blue ? '#5A86FF' : isDark ? '#3A3D44' : '#FFFFFF';
  const base = blue ? '#356BFF' : isDark ? '#30333A' : '#F3F2EF';
  const ledge = blue ? '#1F48C2' : isDark ? '#16171A' : '#CFCDC6';
  const hi = blue ? 'rgba(255,255,255,0.45)' : isDark ? 'rgba(255,255,255,0.10)' : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (!quiet) fx.tap();
        onPress?.();
      }}
      onPressIn={() => (press.value = withTiming(1, { duration: 80 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: 100 }))}
      style={[{ width, minWidth: height, height: height + LEDGE_H, opacity: disabled ? 0.4 : 1 }, style]}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: LEDGE_H, bottom: 0, borderRadius: r, backgroundColor: ledge }} />
      <Animated.View
        style={[
          {
            height,
            borderRadius: r,
            backgroundColor: base,
            backgroundImage: `linear-gradient(180deg, ${top}, ${base})`,
            boxShadow: `inset 0 2px 0 ${hi}`,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            paddingHorizontal: 12,
          },
          faceStyle,
          face,
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'secondary', size = 'md', disabled, trailing, style, accessibilityLabel }: BtnProps) {
  const { c } = useTheme();
  const k = kind === 'outline' ? 'secondary' : kind;
  const primary = k === 'primary';
  const fg = primary ? '#FFFFFF' : k === 'danger' ? c.tile[2] : c.text;
  const text = (
    <>
      <Text style={[type.bodyStrong, { color: fg, fontFamily: font.bodySemi }]}>{label}</Text>
      {typeof trailing === 'string' ? <Text style={[type.bodyStrong, { color: fg, opacity: 0.7, fontVariant: ['tabular-nums'] }]}>{trailing}</Text> : trailing}
    </>
  );
  if (k === 'ghost') {
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
        style={({ pressed }) => [{ minHeight: size === 'lg' ? 56 : 48, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: trailing ? 'space-between' : 'center', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}>
        {text}
      </Pressable>
    );
  }
  return (
    <Key
      label={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      blue={primary}
      height={size === 'lg' ? 56 : 48}
      style={style}
      faceStyle={{ paddingHorizontal: space.lg, justifyContent: trailing ? 'space-between' : 'center' }}>
      {text}
    </Key>
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
/** The sound key: one tap silences effects and music together, the next
   brings both back. Settings keep them apart. Quiet going off, so the tap
   sound does not wake the music it is turning off. */
export function SoundKey() {
  const { c, t, audible, setAudible } = useTheme();
  return (
    <IconButton
      label={audible ? t.soundOff : t.soundOn}
      size={48}
      quiet
      onPress={() => {
        setAudible(!audible);
        if (!audible) fx.tap();
      }}>
      <SoundIcon on={audible} color={c.text} />
    </IconButton>
  );
}

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
  /** No key: a bare glyph, for top bars. */
  plain?: boolean;
  /** Side of the key; never under HIT. */
  size?: number;
}) {
  const s = Math.max(HIT, size);
  if (plain) {
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
        style={({ pressed }) => ({ width: s, height: s, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.6 : 1 })}>
        {children}
      </Pressable>
    );
  }
  return (
    <Key label={label} onPress={onPress} disabled={disabled} quiet={quiet} height={s} width={s} faceStyle={{ paddingHorizontal: 0 }}>
      {children}
    </Key>
  );
}

/* ---------- icons, drawn from blocks ---------- */

export function PauseIcon({ color, s = 24 }: { color: string; s?: number }) {
  return <Icon name="pause" color={color} size={Math.max(24, s)} />;
}

export function Arrow({ dir, color, s = 24 }: { dir: 'left' | 'right' | 'up' | 'down'; color: string; s?: number }) {
  return <Icon name={dir === 'left' ? 'back' : dir === 'right' ? 'chevron' : dir} color={color} size={Math.max(20, s)} />;
}

export function CloseIcon({ color, s = 24 }: { color: string; s?: number }) {
  return <Icon name="close" color={color} size={Math.max(20, s)} />;
}

/* ---------- ladder: the legend of rungs ---------- */

export function Ladder({ best, size = 24, animate }: { best: number; size?: number; animate?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: space.xs }} accessibilityLabel={t.ladder}>
      {LADDER.map((v, k) => (
        <Rung key={v} delay={animate ? k * 50 : undefined}>
          {v <= 2 || v <= best ? <Block v={v} size={size} /> : <Socket size={size} />}
        </Rung>
      ))}
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
  return <Block v={v} size={size} />;
}

/* ---------- settings controls ---------- */

/** A switch: ink track when on, hairline track when off. 44 tall hit area. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c, isDark } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 22 }] }));
  /* A plastic switch: a sunken track, blue when on, and a white key that slides in it. */
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
      <View
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          backgroundColor: value ? '#356BFF' : c.canvas,
          boxShadow: `inset 0 2px 3px rgba(0,0,0,${isDark ? 0.4 : 0.14})`,
        }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 3,
              top: 2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#FFFFFF',
              backgroundImage: 'linear-gradient(180deg, #FFFFFF, #ECEAE4)',
              boxShadow: '0 2px 0 rgba(0,0,0,0.18)',
            },
            knob,
          ]}
        />
      </View>
    </Pressable>
  );
}

/** Choices as a row of keys sunk into a tray: the chosen one is a white key standing up. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderRadius: 14, backgroundColor: c.canvas, padding: 4, gap: 4, boxShadow: `inset 0 2px 3px rgba(0,0,0,${isDark ? 0.4 : 0.1})` }}>
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
            style={[
              { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: on ? 3 : 0, marginTop: on ? 0 : 3 },
              on ? { backgroundColor: c.plate, boxShadow: `0 3px 0 ${c.plateEdge}` } : null,
            ]}>
            <Text style={[type.secondaryStrong, { fontFamily: font.bodySemi, color: on ? c.text : c.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rows on a white plastic plate, split by hairlines. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <View style={[{ backgroundColor: c.plate, borderRadius: 16, paddingHorizontal: space.lg, boxShadow: `0 4px 0 ${c.plateEdge}` }, style]}>
      {items.map((child, k) => (
        <View key={k}>
          {k ? <Rule /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

/* ---------- a dialog card: L2, hairline plus a soft shadow ---------- */

/** A card of white plastic: a rounded plate on its own ledge, like the board. */
export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.plate,
          borderRadius: 20,
          padding: space.xl,
          boxShadow: `0 6px 0 ${c.plateEdge}, 0 14px 24px rgba(0,0,0,0.08)`,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** A whole-screen page in the table colour (pause, game over, win): no
    scrim, the content rises 24pt as it fades in. */
export function Page({ children, top }: { children: ReactNode; top?: ReactNode }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * 24 }] }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            flex: 1,
            width: '100%',
            maxWidth: 440,
            alignSelf: 'center',
            paddingTop: ins.top + 12,
            paddingBottom: ins.bottom + 24,
            paddingHorizontal: 16,
          },
          st,
        ]}>
        {top}
        {children}
      </Animated.View>
    </View>
  );
}

/** A small plastic chip: grey text on the table, or yellow for news (a record). */
export function Chip({ children, yellow, style }: { children: ReactNode; yellow?: boolean; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { height: 32, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
        yellow ? { backgroundColor: '#FFD43B', backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)', boxShadow: '0 3px 0 #C9A21F' } : null,
        style,
      ]}>
      {typeof children === 'string' ? <Text style={{ fontFamily: font.bodySemi, fontSize: 15, color: yellow ? '#2A2A2A' : c.muted }}>{children}</Text> : children}
    </View>
  );
}

/** A big score, Rubik 700, counting up from zero once. */
export function CountUp({ to, size = 64, ms = 600 }: { to: number; size?: number; ms?: number }) {
  const { c } = useTheme();
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [to, ms]);
  return <TileNum v={v} size={size} color={c.text} style={{ lineHeight: Math.round(size * 1.1), fontVariant: ['tabular-nums'] }} />;
}

export function Gear({ color }: { color: string }) {
  return <Icon name="gear" color={color} />;
}

export function SoundIcon({ on, color }: { on: boolean; color: string }) {
  return <Icon name={on ? 'sound' : 'mute'} color={color} />;
}

/* ---------- top bar for pushed screens ---------- */

export function TopBar({ title, onBack, close }: { title: string; onBack: () => void; close?: boolean }) {
  const { c, t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
      <IconButton label={close ? t.close : t.back} size={48} onPress={onBack}>
        <Icon name={close ? 'close' : 'back'} color={c.text} />
      </IconButton>
      <Heading level="heading" style={{ marginBottom: 4 }}>{title}</Heading>
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
      {children ?? (onPress ? <Icon name="chevron" color={c.muted} size={20} /> : null)}
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
