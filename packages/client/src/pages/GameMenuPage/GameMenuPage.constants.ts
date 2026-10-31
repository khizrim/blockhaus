import type { MenuItemProps } from 'src/components/atoms/MenuItem';
import { PAGE_ROUTES } from 'src/utils/constants';

export const MENU_ITEMS: MenuItemProps[] = [
  {
    label: 'never-ending',
    href: PAGE_ROUTES.GAME,
  },
  { label: 'race the clock', href: PAGE_ROUTES.GAME },
  {
    label: 'leaderboards',
    href: PAGE_ROUTES.LEADER_BOARD,
  },
];
