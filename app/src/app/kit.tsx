import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { Body, Button, Glyph, Heading, IconButton, Label, Ladder, PauseIcon, Arrow, Screen, Segmented, TileBadge, Toggle, TopBar, Wordmark } from '@/components/ui';
import { pieceGrid, scenes, type Piece } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { font, LADDER, NAMES, rank } from '@/design/tokens';

/* A living sheet of every piece of the visual language, for prototyping:
   colours, type, the field rules, pieces, controls and the still scenes. */
export default function Kit() {
  const { c } = useTheme();
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [pop, setPop] = useState(0);

  const pieces: Piece[] = [
    { cells: [[0, 0, 1]] },
    { cells: [[0, 0, 2], [1, 0, 2]] },
    { cells: [[0, 0, 3], [0, 1, 3]] },
    { cells: [[0, 0, 2], [1, 0, 2], [2, 0, 2]] },
    { cells: [[0, 0, 1], [0, 1, 1], [1, 1, 1]] },
    { cells: [[0, 0, 6], [1, 0, 6], [1, 1, 6]] },
  ];

  return (
    <Screen>
      <TopBar title="Design kit" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: 30, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Block title="Rungs">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LADDER.map((v) => (
              <View key={v} style={{ width: 74, gap: 4 }}>
                <Field w={1} h={1} values={[v]} cell={74} gap={6} variant="piece" />
                <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: c.text }}>{NAMES[rank(v)]}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: c.muted }}>{c.tile[rank(v)]}</Text>
              </View>
            ))}
          </View>
          <Ladder best={24} />
        </Block>

        <Block title="Surfaces">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(
              [
                ['bg', c.bg],
                ['canvas', c.canvas],
                ['line', c.line],
                ['muted', c.muted],
                ['faint', c.faint],
              ] as const
            ).map(([n, v]) => (
              <View key={n} style={{ flex: 1, gap: 4 }}>
                <View style={{ height: 44, backgroundColor: v, borderWidth: 2, borderColor: c.line }} />
                <Text style={{ fontFamily: font.body, fontSize: 11, color: c.muted }}>{n}</Text>
              </View>
            ))}
          </View>
        </Block>

        <Block title="Type">
          <Wordmark size={22} />
          <Text style={{ fontFamily: font.black, fontSize: 44, color: c.text }}>1,840</Text>
          <Heading>Poster heading</Heading>
          <Body>Dela Gothic One for the name, headings and every number, tiles included. Onest for text.</Body>
          <Label>Label · uppercase</Label>
        </Block>

        <Block title="Fields">
          <Body muted>
            Touching tiles of one value form a field: thick lines between fields, thin folds inside. Tap to replay the merge pop.
          </Body>
          <Pressable onPress={() => setPop((p) => p + 1)} style={{ alignSelf: 'center' }}>
            <Field
              w={5}
              h={4}
              values={[2, 2, 0, 1, 3, 2, 0, 0, 1, 6, 0, 0, 12, 0, 6, 1, 1, 12, 0, 0]}
              cell={52}
              gap={6}
              look={(i) => ({ pop: [12, 17].includes(i) ? pop : 0 })}
            />
          </Pressable>
          <Label>Holding a 1: partners bright, ghost hatched, partner framed</Label>
          <View style={{ alignSelf: 'center' }}>
            <Field
              w={5}
              h={2}
              values={[2, 1, 0, 3, 6, 0, 0, 2, 1, 1]}
              cell={52}
              gap={6}
              look={(i) =>
                i === 1 || i === 2 ? { ghost: 1 } : i === 0 ? { absorb: true } : [3, 4, 8, 9].includes(i) ? { dim: true } : undefined
              }
            />
          </View>
        </Block>

        <Block title="Pieces">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            {pieces.map((p, k) => (
              <Field key={k} variant="piece" {...pieceGrid(p)} cell={28} gap={6} />
            ))}
          </View>
        </Block>

        <Block title="Controls">
          <Button kind="primary" size="lg" label="Primary" />
          <Button kind="primary" tone={8} size="lg" label="Toned" />
          <Button label="Outline" />
          <Button kind="danger" label="Destructive" />
          <Button kind="ghost" label="Ghost link" />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <IconButton label="Pause">
              <PauseIcon color={c.text} />
            </IconButton>
            {(['left', 'down', 'up', 'right'] as const).map((d) => (
              <IconButton key={d} label={d}>
                <Arrow dir={d} color={c.text} />
              </IconButton>
            ))}
            <Toggle label="Toggle" value={on} onChange={setOn} />
          </View>
          <Segmented
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'a', label: 'One' },
              { value: 'b', label: 'Two' },
              { value: 'c', label: 'Three' },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Glyph size={40} />
            <TileBadge v={12} />
            <TileBadge v={96} size={30} />
          </View>
        </Block>

        <Block title="Scenes">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {scenes.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => router.push({ pathname: '/game', params: { scene: s.key } })}
                style={{ gap: 6 }}>
                <Field w={6} h={6} values={s.board} cell={22} gap={4} numbers={false} />
                <Text style={{ fontFamily: font.bodySemi, fontSize: 13, color: c.text }}>{s.title}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} label="Win" onPress={() => router.push('/win')} />
            <Button style={{ flex: 1 }} label="Game over" onPress={() => router.push('/over')} />
            <Button style={{ flex: 1 }} label="Pause" onPress={() => router.push('/pause')} />
          </View>
        </Block>
      </ScrollView>
    </Screen>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderBottomWidth: 2, borderColor: c.stroke, paddingBottom: 6 }}>
        <Label style={{ color: c.text }}>{title}</Label>
      </View>
      {children}
    </View>
  );
}
