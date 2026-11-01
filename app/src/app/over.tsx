import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Block, Poster, PosterBoard, ScoreBand, usePoster } from '@/components/Poster';
import { Body, Button, Label } from '@/components/ui';
import { TileNum } from '@/components/TileNum';
import { dur, space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';
import { pieceGrid } from '@/design/mock';
import { DayClock, MedalTrack, StreakDays, Track, milestonesFor } from '@/components/Track';
import { MEDALS, dayLabel, medalOf, nextMedal, shareOrCopy, shareText } from '@/game/daily';
import { canRemind, useReminder } from '@/game/remind';
import { useGame } from '@/game/store';

/* Game over as a poster (see Poster). Beside the final board, what ended
   the run: in the free game the pieces left with nowhere to go, over a
   block in the colour of the best tile; in the game of the day the medal as
   a block in its colour, over the streak. Under them the score (on yellow
   for a record), then the track as the run left it. The buttons hang below. */
export default function Over() {
  const { c } = useTheme();
  const { game: final, stats, newGame, mode, daily, streak } = useGame();
  const reminder = useReminder();
  const { W, L, inner, cell: CELL, board: BOARD, side } = usePoster();
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
  useEffect(() => fx.over(), []);

  const summary = isDaily
    ? `Игра дня, ${dayLabel(daily.key)}. ${target} очков. ${medal ? `Медаль: ${medal.name}.` : `До бронзы не хватило ${miss!.at - target}.`}`
    : `Места нет. ${target} очков, лучшая плитка ${final.bestTile}.${next ? ` Следующая веха ${next}.` : ''}`;

  const bestFill = final.bestTile ? c.tile[rank(final.bestTile)] : undefined;
  const medalFill = medal ? (medal.tile ? c.tile[medal.tile] : c.faint) : undefined;
  // The stuck pieces as large as their cell allows: two rows of two-cell pieces at most.
  const pieceCell = Math.max(12, Math.min(Math.round(CELL * 0.7), Math.floor((upper - space.md * 2) / 2), Math.floor((side - space.md * 3) / 4)));

  return (
    <Overlay>
      <Poster label={summary}>
        <View style={{ flexDirection: 'row', gap: L }}>
          <PosterBoard values={final.board} />
          <View style={{ width: side, gap: L }}>
            {isDaily ? (
              <>
                {/* the medal won, as a block in its colour; none leaves paper */}
                <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)}>
                  <Block fill={medalFill} style={{ height: lower }} />
                </Animated.View>
                <Block style={{ height: upper, alignItems: 'center', justifyContent: 'center' }}>
                  <StreakDays count={streak.count} size={Math.floor((side - space.sm * 2 - 6 * 3) / 7)} />
                </Block>
              </>
            ) : (
              <>
                {/* what would not fit: the tray as it was left */}
                <Block style={{ height: upper, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', alignContent: 'center', gap: space.sm }}>
                  {stuck.map((p, k) => (
                    <Field key={k} variant="piece" {...pieceGrid(p!)} cell={pieceCell} gap={Math.max(2, Math.round(L * 0.6))} numbers={false} />
                  ))}
                </Block>
                {/* the best tile, as a block of its colour */}
                <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)}>
                  <Block fill={bestFill} style={{ height: lower, alignItems: 'center', justifyContent: 'center' }}>
                    {final.bestTile ? <TileNum v={final.bestTile} color={c.ink[rank(final.bestTile)]} size={Math.round(lower * 0.36)} /> : null}
                  </Block>
                </Animated.View>
              </>
            )}
          </View>
        </View>

        {/* the score, on yellow for a new record */}
        <ScoreBand
          value={target}
          fill={record ? c.tile[3] : undefined}
          ink={record ? c.ink[3] : undefined}
          aside={!isDaily && stats.played > 1 && !record ? <Label meta>{`рекорд ${stats.best.toLocaleString('ru-RU')}`}</Label> : null}
        />

        <Animated.View entering={FadeIn.delay(dur.base).duration(dur.base)}>
          <Block style={{ padding: space.md, gap: space.md }}>
            {isDaily ? (
              <>
                <MedalTrack medals={MEDALS} score={final.score} width={inner - space.md * 2} gap={4} top={0} />
                <DayClock width={inner - space.md * 2} />
              </>
            ) : (
              <Track steps={steps} best={final.bestTile} next={next} width={inner - space.md * 2} gap={4} top={0} />
            )}
          </Block>
        </Animated.View>
      </Poster>

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
