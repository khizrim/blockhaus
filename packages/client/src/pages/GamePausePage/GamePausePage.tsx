import { Menu } from '@gravity-ui/uikit';
import { useNavigate } from 'react-router-dom';

import { Container } from 'src/components/atoms/Container';
import type { MenuItemProps } from 'src/components/atoms/MenuItem';
import { MenuItem } from 'src/components/atoms/MenuItem';
import { Page } from 'src/components/organisms/Page';
import { PAGE_ROUTES } from 'src/utils/constants';

export const GamePausePage = () => {
  const navigate = useNavigate();

  const stopGame = () => {
    localStorage.removeItem('scores');
    localStorage.removeItem('field');
    localStorage.removeItem('time');
    localStorage.removeItem('type');
    localStorage.removeItem('difficult');
    navigate(PAGE_ROUTES.MENU);
  };

  const MENU_ITEMS: MenuItemProps[] = [
    { label: 'resume', href: PAGE_ROUTES.GAME },
    { label: 'stop', onClick: stopGame, theme: 'danger' },
  ];

  return (
    <Page>
      <Menu size='xl'>
        <Container direction='column' alignItems='center'>
          {MENU_ITEMS.map(item => (
            <MenuItem key={item.label} {...item} />
          ))}
        </Container>
      </Menu>
    </Page>
  );
};
