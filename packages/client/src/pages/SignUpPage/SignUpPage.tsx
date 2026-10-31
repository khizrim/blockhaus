import React from 'react';

import { Loader, Text } from '@gravity-ui/uikit';
import { Navigate } from 'react-router-dom';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';
import { Logo } from 'src/components/atoms/Logo';
import { BackButton } from 'src/components/molecules/BackButton/BackButton';
import { Form } from 'src/components/molecules/Form';
import { Page } from 'src/components/organisms/Page';
import type { TSignUpRequest } from 'src/shared/types/user';
import { signUpValidationSchema } from 'src/shared/validation/user';
import { useGetUserQuery, useSignUpMutation } from 'src/store/features';
import { isFetchBaseQueryError } from 'src/utils/api-errors';
import { PAGE_ROUTES } from 'src/utils/constants';

import { inputs } from './SignUpPage.constants';

export const SignUpPage = () => {
  const { data: user, error: userError } = useGetUserQuery();
  const [signUp, { error: signUpError }] = useSignUpMutation();

  const onSignUp = async (formData: TSignUpRequest) => {
    await signUp(formData);
  };

  const getErrorMessage = () => {
    if (isFetchBaseQueryError(signUpError)) {
      return (signUpError.data as { reason?: string })?.reason;
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
            <Text variant='display-2'>Sign up</Text>
            <Text variant='subheader-2' style={{ textAlign: 'center' }}>
              New here? Dive in! Just fill in the form and let the good times roll.
            </Text>
            <Form
              inputs={inputs}
              validationSchema={signUpValidationSchema}
              onSubmit={onSignUp}
              errorMessage={getErrorMessage()}
            />
            <Button view='flat' isNavigate navigateTo={PAGE_ROUTES.SIGN_IN}>
              Signed up already? Sign In
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
