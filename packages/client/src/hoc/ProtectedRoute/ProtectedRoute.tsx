import React from 'react';

import { Loader } from '@gravity-ui/uikit';
import { Navigate } from 'react-router-dom';

import { Page } from 'src/components/organisms';
import { useGetUserQuery } from 'src/store/features';

import { isFetchBaseQueryError } from 'src/utils/api-errors';
import { PAGE_ROUTES } from 'src/utils/constants';

interface ProtectedRouteProps {
  element: JSX.Element;
}

export const LOADER_ID = 'loader';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  const { data: user, error } = useGetUserQuery();

  if (user) {
    return element;
  }

  if (error) {
    if (isFetchBaseQueryError(error) && error.status === 401) {
      return <Navigate to={PAGE_ROUTES.SIGN_IN} />;
    } else {
      throw error;
    }
  }

  return (
    <Page>
      <Loader size='l' qa={LOADER_ID} />
    </Page>
  );
};
