import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, View } from 'react-native';

import { Body, Button, CountUp, Heading, Label, Page } from '@/components/ui';
import { space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { dayKey, medalFor, medalsFor, namesFor, ruleOf } from '@/game/daily';
import { useGame } from '@/game/store';

const copy = {
  ru: {
    title: 'Игра дня', rules: 'Одна партия на дату. У всех одинаковое стартовое поле и 30 фигур.',
    plain: '', stone: 'Два камня делят поле и останавливают сдвиги.', still: 'Сегодня поле нельзя сдвигать.',
    domino: 'Сегодня все фигуры — домино.', big: 'На старте уже есть крупные плитки.',
    points: 'Очки', medals: 'Пороги медалей', finished: 'Партия завершена', left: 'Использовано фигур',
  },
  en: {
    title: 'Daily game', rules: 'One run each day. Everyone starts with the same board and a budget of 30 pieces.',
    plain: '', stone: 'Two stones split the board and block sweeps.', still: 'No sweeps today.',
    domino: 'Every piece today is a domino.', big: 'The board starts with larger tiles.',
    points: 'Score', medals: 'Medal thresholds', finished: 'Run complete', left: 'Pieces used',
  },
};

export default function DailyScreen() {
  const { t } = useTheme();
  const { mode, dailyRun, startDaily, leaveDaily, ready } = useGame();
  const labels = copy[t.locale.startsWith('ru') ? 'ru' : 'en'];
  const [today, setToday] = useState(dayKey);
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(refresh, Math.max(1, midnight.getTime() - Date.now()));
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [today]);
  // A game that straddled midnight still gets its own dated result.
  const key = mode === 'daily' && dailyRun ? dailyRun.key : today;
  const game = dailyRun?.key === key ? dailyRun.game : null;
  const done = !!game?.over;
  const rank = medalFor(key, game?.score ?? 0);
  const names = namesFor(t.locale);
  const rule = labels[ruleOf(key)];
  const home = () => { leaveDaily(); router.dismissTo('/'); };
  const play = () => {
    const now = dayKey();
    if (now !== today) { setToday(now); return; }
    startDaily(now);
    router.replace('/game');
  };
  return (
    <Page>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: space.md, paddingVertical: space.lg }}>
        <Label>{new Date(key + 'T12:00:00').toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
        <Heading>{labels.title}</Heading>
        {done && game ? (
          <>
            <Heading level="heading">{rank ? names[rank - 1] : labels.finished}</Heading>
            <Label>{labels.points}</Label>
            <CountUp to={game.score} />
          </>
        ) : (
          <>
            <Body>{labels.rules}</Body>
            {rule ? <Body>{rule}</Body> : null}
          </>
        )}
        {game ? <Body>{labels.left} · {game.moves}/30</Body> : null}
        <Label>{labels.medals}</Label>
        {medalsFor(key).map((at, i) => <Body key={at}>{names[i]} · {at}</Body>)}
      </ScrollView>
      <View style={{ gap: space.sm }}>
        {!done ? <Button kind="primary" size="lg" disabled={!ready} label={game ? t.resume : t.play} onPress={play} /> : null}
        <Button label={t.toMenu} onPress={home} />
      </View>
    </Page>
  );
}
