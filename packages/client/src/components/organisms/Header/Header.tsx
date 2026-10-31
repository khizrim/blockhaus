import React from 'react';

import { ArrowLeft } from '@gravity-ui/icons';
import { Icon, Text } from '@gravity-ui/uikit';

import { Container } from 'src/components/atoms/Container';
import { BackButton } from 'src/components/molecules/BackButton/BackButton';
import { User } from 'src/components/molecules/User';
import { PAGE_ROUTES } from 'src/utils/constants';

export type HeaderProps = {
  title?: string;
  hasBackButton?: boolean;
};

export const Header = ({ title, hasBackButton }: HeaderProps) => {
  return (
    <Container
      width='100%'
      justifyContent={hasBackButton ? 'space-between' : 'flex-end'}
      alignItems='center'
      minHeight='80px'
      spacing={{ px: 4 }}>
      <Container width='300px'>
        {hasBackButton && (
          <BackButton fallbackRoute={PAGE_ROUTES.MENU}>
            <Icon data={ArrowLeft} />
            Back
          </BackButton>
        )}
      </Container>
      <Container grow justifyContent='center'>
        {title && <Text variant='display-1'>{title}</Text>}
      </Container>
      <Container width='300px' justifyContent='flex-end'>
        <User />
      </Container>
    </Container>
  );
};
