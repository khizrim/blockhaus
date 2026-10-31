import { router, useLocalSearchParams } from 'expo-router';

import { DirectionSwitch, MenuA, MenuB, MenuC } from '@/brand/menus';

/* First screen. While the identity is being chosen, all three directions live
   here behind a small A/B/C switch; ?v=a|b|c opens one directly. */
export default function Menu() {
  const { v = 'a' } = useLocalSearchParams<{ v?: string }>();
  const pick = (k: string) => router.setParams({ v: k });
  if (v === 'b') return <MenuB key="b" switcher={<DirectionSwitch v="b" onChange={pick} />} />;
  if (v === 'c') return <MenuC key="c" switcher={<DirectionSwitch v="c" onChange={pick} />} />;
  return <MenuA key="a" switcher={<DirectionSwitch v="a" onChange={pick} />} />;
}
