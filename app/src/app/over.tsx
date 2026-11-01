import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Label } from '@/components/ui';
import { TileNum } from '@/components/TileNum';
import { dur, space, useCalm } from '@/design/system';
import { useTheme } from '@/design/theme';
import { Enamel, panelEnamel } from '@/design/depth';
import { font, rank } from '@/design/tokens';
import { pieceGrid } from '@/design/mock';
import { DayClock, MedalTrack, StreakDays, Track, milestonesFor } from '@/components/Track';
import { MEDALS, dayLabel, medalOf, nextMedal, shareOrCopy, shareText } from '@/game/daily';
import { canRemind, useReminder } from '@/game/remind';
import { useGame } from '@/game/store';

/* Game over as a poster, built like the menu's: a black ground whose
   gaps are the lines, and blocks set into it. The final board takes the
   big field. Beside it, what ended the run: in the free game the pieces
   left with nowhere to go, over a block in the colour of the best tile; in
   the game of the day the medal as a block in its colour, over the streak.
   Under them the score, set in the wordmark's face (on yellow for a
   record), then the track as the run left it. The buttons hang below. */
export default function Over() {
  const { c, isDark } = useTheme();
  const calm = useCalm();
  const { game: final, stats, newGame, mode, daily, streak } = useGame();
  const reminder = useReminder();
  const { width } = useWindowDimensions();
  // The poster: as wide as the dialog, lines of the board's weight.
  const W = Math.min(width - space.lg * 2, 360);
  const L = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  const inner = W - L * 2;
  const CELL = Math.floor((inner * 0.64 - L) / 6);
  const BOARD = CELL * 6;
  const side = inner - BOARD - L;
  const lower = side; // the square block in the right column
  const upper = BOARD - lower - L;
  const steps = milestonesFor(final.cfg.goal);
  const next = steps.find((v) => v > final.bestTile) ?? null;
  const isDaily = mode === 'daily';
  const medal = medalOf(final.score);
  const miss = nextMedal(final.score);
  const stuck = final.tray.filter((p) => p && !p.used);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const share = async () => {
    if (!daily.result) return;
    const r = await shareOrCopy(shareText(daily.key, daily.result, streak.count));
    setShareNote(r === 'copied' ? 'Результат скопирован' : r === 'failed' ? 'Не получилось поделиться' : null);
  };
  const target = final.score;
  // The first game is always a record, so it is not called one.
  const record = !isDaily && target >= stats.best && target > 0 && stats.played > 1;
  const [shown, setShown] = useState(calm ? target : 0);
  useEffect(() => fx.over(), []);

  useEffect(() => {
    if (calm) return setShown(target);
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 600);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, calm]);

  const summary = isDaily
    ? `Игра дня, ${dayLabel(daily.key)}. ${target} очков. ${medal ? `Медаль: ${medal.name}.` : `До бронзы не хватило ${miss!.at - target}.`}`
    : `Места нет. ${target} очков, лучшая плитка ${final.bestTile}.${next ? ` Следующая веха ${next}.` : ''}`;

  const paper = c.canvas;
  const block = (fill: string) => (fill === paper ? null : <Enamel fill={fill} size={side} dark={isDark} />);
  const bestFill = final.bestTile ? c.tile[rank(final.bestTile)] : paper;
  const medalFill = medal ? (medal.tile ? c.tile[medal.tile] : c.faint) : paper;
  const scoreFill = record ? c.tile[3] : paper;
  // The stuck pieces as large as their cell allows: two rows of two-cell pieces at most.
  const pieceCell = Math.max(12, Math.min(Math.round(CELL * 0.7), Math.floor((upper - space.md * 2) / 2), Math.floor((side - space.md * 3) / 4)));

  return (
    <Overlay>
      <View accessible accessibilityLabel={summary} style={[{ width: W, padding: L, gap: L, backgroundColor: c.line }, panelEnamel(c.bg, isDark)]}>
        <View style={{ flexDirection: 'row', gap: L }}>
          {/* the final board, its own frame folded into the poster's lines */}
          <View style={{ width: BOARD, height: BOARD, overflow: 'hidden' }}>
            <Field w={6} h={6} values={final.board} cell={CELL} gap={L} numbers={false} style={{ margin: -L / 2 }} />
          </View>
          <View style={{ width: side, gap: L }}>
            {isDaily ? (
              <>
                {/* the medal won, as a block in its colour; none leaves paper */}
                <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ height: lower, backgroundColor: medalFill }}>
                  {block(medalFill)}
                </Animated.View>
                <View style={{ height: upper, backgroundColor: paper, alignItems: 'center', justifyContent: 'center' }}>
                  <StreakDays count={streak.count} size={Math.floor((side - space.sm * 2 - 6 * 3) / 7)} />
                </View>
              </>
            ) : (
              <>
                {/* what would not fit: the tray as it was left */}
                <View style={{ height: upper, backgroundColor: paper, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', alignContent: 'center', gap: space.sm }}>
                  {stuck.map((p, k) => (
                    <Field key={k} variant="piece" {...pieceGrid(p!)} cell={pieceCell} gap={Math.max(2, Math.round(L * 0.6))} numbers={false} />
                  ))}
                </View>
                {/* the best tile, as a block of its colour */}
                <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ height: lower, backgroundColor: bestFill, alignItems: 'center', justifyContent: 'center' }}>
                  {block(bestFill)}
                  {final.bestTile ? <TileNum v={final.bestTile} color={c.ink[rank(final.bestTile)]} size={Math.round(lower * 0.36)} /> : null}
                </Animated.View>
              </>
            )}
          </View>
        </View>

        {/* the score: the wordmark's face, on yellow for a new record */}
        <View style={{ backgroundColor: scoreFill, paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          {block(scoreFill)}
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontFamily: font.wide, fontSize: 48, lineHeight: 60, color: record ? c.ink[3] : c.text, fontVariant: ['tabular-nums'] }}>
            {shown.toLocaleString('ru-RU')}
          </Text>
          {!isDaily && stats.played > 1 && !record ? <Label meta>{`рекорд ${stats.best.toLocaleString('ru-RU')}`}</Label> : null}
        </View>

        <Animated.View entering={FadeIn.delay(dur.base).duration(dur.base)} style={{ backgroundColor: paper, padding: space.md, gap: space.md }}>
          {isDaily ? (
            <>
              <MedalTrack medals={MEDALS} score={final.score} width={inner - space.md * 2} gap={4} top={0} />
              <DayClock width={inner - space.md * 2} />
            </>
          ) : (
            <Track steps={steps} best={final.bestTile} next={next} width={inner - space.md * 2} gap={4} top={0} />
          )}
        </Animated.View>
      </View>

        <View style={{ width: W, gap: space.md, marginTop: space.lg }}>
          {isDaily ? (
            <Button kind="primary" size="lg" label="Поделиться" onPress={share} />
          ) : (
            <Button
              kind="primary"
              size="lg"
              label="Сыграть ещё"
              onPress={() => {
                newGame();
                router.back();
              }}
            />
          )}
          {shareNote ? <Body muted small style={{ textAlign: 'center' }}>{shareNote}</Body> : null}
          {/* A reason to come back: the phone says when the next one is out. */}
          {isDaily && canRemind && !reminder.on ? <Button label="Напоминать в 9:00" onPress={reminder.enable} /> : null}
          {isDaily && reminder.on && reminder.justSet ? <Body muted small style={{ textAlign: 'center' }}>Напомним завтра в 9:00</Body> : null}
          <Button label="Выйти в меню" onPress={() => router.dismissTo('/')} />
        </View>
    </Overlay>
  );
}
