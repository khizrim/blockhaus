import React from 'react';

import { ArrowRightFromSquare, Pencil } from '@gravity-ui/icons';
import { Icon, Skeleton, User as UserComponent, UserLabel } from '@gravity-ui/uikit';
import { useNavigate } from 'react-router-dom';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';

import { useGetUserQuery, useLogoutMutation } from 'src/store/features';
import { isFetchBaseQueryError } from 'src/utils/api-errors';
import { PAGE_ROUTES, RESOURCE_URL } from 'src/utils/constants';

export type UserProps = {
  isFullSize?: boolean;
};

export const User = ({ isFullSize = false }: UserProps) => {
  const navigate = useNavigate();

  const { data: user, error } = useGetUserQuery();
  const [logout] = useLogoutMutation();

  const onSignOut = async () => {
    logout();
  };

  if (user) {
    const name = user?.display_name || `${user?.first_name} ${user?.second_name}`;
    const avatar = user?.avatar ? `${RESOURCE_URL}${user?.avatar}` : undefined;

    return (
      <Container alignItems='center'>
        {isFullSize ? (
          <UserComponent
            size='xl'
            avatar={{
              imgUrl: avatar,
              text: name,
            }}
            name={name}
            description={user.email}
          />
        ) : (
          <UserLabel size='xl' view='clear' avatar={avatar} onClick={() => navigate(PAGE_ROUTES.PROFILE)}>
            {name}
          </UserLabel>
        )}
        <Container gap={0}>
          {isFullSize && (
            <Button view='flat-secondary' size='xl' onClick={() => navigate(PAGE_ROUTES.PROFILE)} qa='edit-button'>
              <Icon data={Pencil} />
            </Button>
          )}
          <Button view='flat-danger' size='xl' onClick={onSignOut} qa='sign-out-button'>
            <Icon data={ArrowRightFromSquare} />
          </Button>
        </Container>
      </Container>
    );
  }

  if (error) {
    if (isFetchBaseQueryError(error) && error.status === 401) {
      return (
        <Container alignItems='center'>
          <Button view='flat-action' type='button' isNavigate navigateTo={PAGE_ROUTES.SIGN_IN}>
            Sign In
          </Button>
        </Container>
      );
    }
  }

  return (
    <Container alignItems='center'>
      <Skeleton style={{ height: '50px', width: '200px' }} qa='skeleton' />
    </Container>
  );
};
