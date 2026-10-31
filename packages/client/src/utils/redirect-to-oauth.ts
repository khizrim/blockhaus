import { REDIRECT_URL } from './constants';

export const redirectToOAuth = (serviceId: string) => {
  window.location.replace(
    `https://oauth.yandex.ru/authorize?response_type=code&client_id=${serviceId}&redirect_uri=${REDIRECT_URL}`
  );
};
