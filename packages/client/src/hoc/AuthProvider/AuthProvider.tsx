import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import AuthAPI from 'src/services/api/auth-api';
import type { Nullable } from 'src/shared/types/global';
import type { TUser } from 'src/shared/types/user';
import Helpers from 'src/utils/helpers';

import { AuthContext } from './AuthProvider.context';

export const authAPI = new AuthAPI();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Nullable<TUser>>(null);
  const [userIsLoading, setUserIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const isAuthenticated = async () => {
      setUserIsLoading(true);

      try {
        const isAuth = localStorage.getItem('isAuth');
        if (isAuth !== null) await authAPI.getUser(updateUser, errorHandler);
      } catch (err) {
        errorHandler(err as Error);
      } finally {
        setUserIsLoading(false);
      }
    };

    isAuthenticated();
  }, []);

  const updateUser = (user: TUser) => {
    localStorage.setItem('isAuth', 'true');
    setUser(user);
  };

  const errorHandler = (err: Error) => {
    Helpers.Log('ERROR', err);
  };

  return <AuthContext.Provider value={{ user, setUser, userIsLoading }}>{children}</AuthContext.Provider>;
};
