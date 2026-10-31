import { Menu } from '@gravity-ui/uikit';

import { useDispatch } from 'react-redux';

import { useNavigate } from 'react-router-dom';

import { Container } from 'src/components/atoms/Container';
import { Logo } from 'src/components/atoms/Logo';
import type { MenuItemProps } from 'src/components/atoms/MenuItem';

import { MenuItem } from 'src/components/atoms/MenuItem';
import { Copyright } from 'src/components/molecules/Copyright';
import { Page } from 'src/components/organisms/Page';

import { PAGE_ROUTES } from 'src/utils/constants';

import { setGameDifficult } from '../../store';

export const GameDifficultPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const goGame = (gameDifficult: number) => {
    console.info('gameDifficult', gameDifficult);
    dispatch(setGameDifficult(gameDifficult));
    localStorage.removeItem('scores');
    localStorage.removeItem('field');
    localStorage.removeItem('time');
    localStorage.removeItem('type');
    localStorage.removeItem('difficult');
    navigate(PAGE_ROUTES.GAME);
  };

  const MENU_ITEMS: MenuItemProps[] = [
    { label: 'easy', onClick: () => goGame(0) },
    { label: 'medium', onClick: () => goGame(1) },
    { label: 'hard', onClick: () => goGame(2) },
    { label: 'nightmare', onClick: () => goGame(3) },
  ];

  return (
    <Page>
      <Logo isFull size='auto' />
      <Menu size='xl'>
        <Container direction='column' alignItems='center'>
          {MENU_ITEMS.map(item => (
            <MenuItem key={item.label} {...item} />
          ))}
        </Container>
      </Menu>
      <Copyright />
    </Page>
  );
};
