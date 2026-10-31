import { YANDEX_URL } from 'src/utils/constants';

export default class BaseAPI {
  static host = YANDEX_URL;

  post<TRequest>(url: string, data: TRequest, credentials = 'include') {
    return fetch(BaseAPI.host + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      credentials: credentials === 'include' ? 'include' : 'same-origin',
      body: JSON.stringify(data),
    });
  }

  get(url: string) {
    return fetch(BaseAPI.host + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      credentials: 'include',
    });
  }

  put<TRequest>(url: string, data: TRequest, credentials = 'include') {
    const isFormData = data instanceof FormData;

    return fetch(BaseAPI.host + url, {
      method: 'PUT',
      headers:
        data instanceof FormData
          ? undefined
          : {
              'Content-Type': 'application/json;charset=utf-8',
            },
      credentials: credentials === 'include' ? 'include' : 'same-origin',
      body: isFormData ? (data as unknown as FormData) : JSON.stringify(data),
    });
  }

  delete(url: string) {
    return fetch(BaseAPI.host + url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      credentials: 'include',
    });
  }
}
