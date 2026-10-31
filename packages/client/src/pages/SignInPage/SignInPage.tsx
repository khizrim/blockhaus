import React from 'react';

import { LogoYandex } from '@gravity-ui/icons';
import { Icon, Loader, Text } from '@gravity-ui/uikit';
import { Navigate } from 'react-router-dom';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';
import { Logo } from 'src/components/atoms/Logo';
import { BackButton } from 'src/components/molecules/BackButton/BackButton';
import { Form } from 'src/components/molecules/Form';
import { Page } from 'src/components/organisms/Page';
import type { TSignInRequest } from 'src/shared/types/user';

import { useGetUserQuery, useLazyYaGetServiceIdQuery, useSignInMutation } from 'src/store/features';
import { isFetchBaseQueryError } from 'src/utils/api-errors';
import { PAGE_ROUTES } from 'src/utils/constants';

import { redirectToOAuth } from 'src/utils/redirect-to-oauth';

import { inputs } from './SignInPage.constants';

export const SignInPage: React.FC = () => {
  const { data: user, error: userError } = useGetUserQuery();
  const [signIn, { error: signInError }] = useSignInMutation();
  const [getServiceId] = useLazyYaGetServiceIdQuery();

  const onSignIn = async (formData: TSignInRequest) => {
    await signIn(formData);
  };

  const onOAuth = async () => {
    const { data } = await getServiceId();

    if (!data) return;

    redirectToOAuth(data.service_id);
  };

  const getErrorMessage = () => {
    if (isFetchBaseQueryError(signInError)) {
      return (signInError.data as { reason?: string })?.reason;
    }
  };

  if (user) {
    return <Navigate to={PAGE_ROUTES.MENU} />;
  }

  if (userError) {
    if (isFetchBaseQueryError(userError) && userError.status === 401) {
      return (
        <Page>
          <Logo size='sm' />
          <Container direction='column' alignItems='center'>
            <Text variant='display-2'>Sign in</Text>
            <Text variant='subheader-2' style={{ textAlign: 'center' }}>
              Back again? Just sign in to keep your results showing up on the leaderboards
            </Text>
            <Form inputs={inputs} onSubmit={onSignIn} errorMessage={getErrorMessage()} />
            <Button view='outlined-action' onClick={onOAuth}>
              <Icon data={LogoYandex} />
              Auth with Yandex
            </Button>
            <Button view='flat' isNavigate navigateTo={PAGE_ROUTES.SIGN_UP}>
              First time here? Sign up
            </Button>
            <BackButton fallbackRoute={PAGE_ROUTES.MENU} />
          </Container>
        </Page>
      );
    }
  }

  return (
    <Page>
      <Loader size='l' qa='loader' />
    </Page>
  );
};
