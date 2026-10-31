import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { API_URL } from 'src/utils/constants';

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, credentials: 'include', mode: 'cors' }),
  endpoints: () => ({}),
  tagTypes: ['Auth'],
});
