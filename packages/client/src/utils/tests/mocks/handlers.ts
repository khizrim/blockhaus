import { http, HttpResponse } from 'msw';

import { YANDEX_URL } from 'src/utils/constants';

import { mockedUser } from './mocked-user';

export const handlers = [
  http.get(`${YANDEX_URL}/auth/user`, () => {
    return HttpResponse.json(mockedUser);
  }),
  http.post(`${YANDEX_URL}/auth/signin`, () => {
    return HttpResponse.text('Ok');
  }),
];

export const unauthorizedHandlers = [
  http.get(`${YANDEX_URL}/auth/user`, () => {
    return HttpResponse.json({ reason: 'Cookie is not valid' }, { status: 401 });
  }),
  http.post(`${YANDEX_URL}/auth/signin`, () => {
    return HttpResponse.json({ reason: 'Invalid credentials' }, { status: 401 });
  }),
];
