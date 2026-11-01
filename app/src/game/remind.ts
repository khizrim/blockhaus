import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/* The morning reminder for the game of the day: one local notification a
   day at 9:00, nothing sent to any server. Offered after a game of the day,
   switched off in Settings. Phones only: a browser tab cannot be woken. */

const KEY = 'blockhaus:remind';
export const canRemind = Platform.OS === 'ios' || Platform.OS === 'android';
const HOUR = 9;

type N = typeof import('expo-notifications');
const lib = (): N => require('expo-notifications') as N;

async function schedule(): Promise<boolean> {
  const n = lib();
  const perm = await n.requestPermissionsAsync();
  if (!perm.granted) return false;
  await n.cancelAllScheduledNotificationsAsync();
  await n.scheduleNotificationAsync({
    content: { title: 'blockhaus', body: 'Новая игра дня готова. Та же доска у всех.' },
    trigger: { type: n.SchedulableTriggerInputTypes.DAILY, hour: HOUR, minute: 0 },
  });
  return true;
}

async function cancel() {
  await lib().cancelAllScheduledNotificationsAsync();
}

export function useReminder() {
  const [on, setOn] = useState(false);
  const [justSet, setJustSet] = useState(false);
  useEffect(() => {
    if (!canRemind) return;
    AsyncStorage.getItem(KEY)
      .then((v) => setOn(v === '1'))
      .catch(() => {});
  }, []);
  const enable = useCallback(async () => {
    if (!canRemind) return;
    try {
      const ok = await schedule();
      if (!ok) return;
      setOn(true);
      setJustSet(true);
      await AsyncStorage.setItem(KEY, '1');
    } catch {}
  }, []);
  const disable = useCallback(async () => {
    if (!canRemind) return;
    setOn(false);
    try {
      await cancel();
      await AsyncStorage.setItem(KEY, '0');
    } catch {}
  }, []);
  return { on, justSet, enable, disable };
}
