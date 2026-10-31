import { Menu, Text } from '@gravity-ui/uikit';
import { useNavigate } from 'react-router-dom';

export type MenuItemProps = {
  label: string;
  href?: string;
  theme?: 'normal' | 'danger';
  onClick?: () => void;
  isAuth?: boolean;
};

export const MenuItem = ({ label, href, theme = 'normal', onClick }: MenuItemProps) => {
  const navigate = useNavigate();

  const goToHref = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <Menu.Item theme={theme} style={{ minHeight: '50px' }} onClick={onClick || goToHref}>
      <Text variant='display-2'>{label}</Text>
    </Menu.Item>
  );
};
