import type { TUserProfileRequest } from 'src/shared/types/user';
import { api } from 'src/store/features/api';

export const userApi = api.injectEndpoints({
  endpoints: build => ({
    updateAvatar: build.mutation<void, FormData>({
      query: data => ({
        url: '/proxy/user/profile/avatar',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    updateProfile: build.mutation<void, TUserProfileRequest>({
      query: data => ({
        url: '/proxy/user/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const { useUpdateAvatarMutation, useUpdateProfileMutation } = userApi;
