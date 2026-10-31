import type { ButtonProps as GravityButtonProps } from '@gravity-ui/uikit';
import { Button as ButtonComponent } from '@gravity-ui/uikit';
import { Link } from 'react-router-dom';

export type ButtonProps = GravityButtonProps & {
  isNavigate?: boolean;
  navigateTo?: string | number;
};

export const Button = ({
  type = 'button',
  view = 'flat',
  children,
  isNavigate = false,
  navigateTo,
  ...props
}: ButtonProps) => {
  const extraProps = isNavigate ? { to: navigateTo } : {};

  return (
    <ButtonComponent
      type={type}
      view={view}
      size='xl'
      pin='brick-brick'
      component={isNavigate ? Link : undefined}
      extraProps={extraProps as never}
      {...props}>
      {children}
    </ButtonComponent>
  );
};
