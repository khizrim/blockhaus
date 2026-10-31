import type { TSignInRequest, TSignUpRequest, TUser } from 'src/shared/types/user';
import type { TYandex } from 'src/shared/types/yandex';
import { api } from 'src/store/features/api';

import { REDIRECT_URL } from 'src/utils/constants';

export const authApi = api.injectEndpoints({
  endpoints: build => ({
    getUser: build.query<TUser, void>({
      query: () => '/proxy/auth/user',
      providesTags: ['Auth'],
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        url: '/proxy/auth/logout',
        method: 'POST',
        responseHandler: response => response.text(),
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(api.util.resetApiState());
        } catch (err) {
          dispatch(api.util.invalidateTags(['Auth']));
        }
      },
    }),
    signIn: build.mutation<void, TSignInRequest>({
      query: data => ({
        url: '/proxy/auth/signin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    signUp: build.mutation<void, TSignUpRequest>({
      query: data => ({
        url: '/proxy/auth/signup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    yaGetServiceId: build.query<TYandex, void>({
      query: () => ({
        url: '/proxy/oauth/yandex/service-id',
        method: 'GET',
        params: { redirect_uri: REDIRECT_URL },
      }),
    }),
    yaSignInUp: build.mutation<void, string>({
      query: code => ({
        url: '/proxy/oauth/yandex',
        method: 'POST',
        body: {
          code,
          redirect_uri: REDIRECT_URL,
        },
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetUserQuery,
  useLogoutMutation,
  useSignInMutation,
  useSignUpMutation,
  useLazyYaGetServiceIdQuery,
  useYaSignInUpMutation,
} = authApi;
