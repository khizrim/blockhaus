import React from 'react';

import { Text } from '@gravity-ui/uikit';

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Container } from 'src/components/atoms/Container';
import { BackButton } from 'src/components/molecules/BackButton/BackButton';
import { Page } from 'src/components/organisms/Page';
import { PAGE_ROUTES } from 'src/utils/constants';

const errorMessages: Record<number, { title: string; code: string; message?: string }> = {
  404: {
    title: 'Oh No!',
    code: '#404',
    message: 'You’ve hit a block that doesn’t exist.',
  },
  500: {
    title: 'Something went wrong!',
    code: '#500',
    message: 'We know about it and we’re working on it!',
  },
  1000: {
    title: 'Panic!',
    code: 'Panic!!',
  },
};

export const ErrorPage = () => {
  const error = useRouteError();

  let msg = '';
  let errorCode = 1000;

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        errorCode = 404;
        break;
      case 500:
        errorCode = 500;
        break;
      default:
        msg = error.statusText;
    }
  } else {
    msg = error as string;
  }

  const { title, code, message = msg } = errorMessages[errorCode];

  return (
    <Page isFullWidth withHeader>
      <Container alignItems='center' gap={8} grow>
        <Text variant='display-4'>{title}</Text>
        <Container direction='column'>
          <Text variant='subheader-1'>{code}</Text>
          <Text variant='code-2'>{message}</Text>
        </Container>
        <BackButton fallbackRoute={PAGE_ROUTES.MENU}>Return to Start</BackButton>
      </Container>
    </Page>
  );
};
