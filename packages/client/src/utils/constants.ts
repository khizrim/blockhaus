export const HOST = 'http://friday-night-push-blockhau-40.ya-praktikum.tech';
export const SERVER_HOST_URL = `${HOST}:3001`;
export const API_URL = `${SERVER_HOST_URL}/api/v1`;
export const YANDEX_URL = `${API_URL}/proxy`;

// OAuth
export const REDIRECT_URL = `${HOST}:3000`;

export const RESOURCE_URL = YANDEX_URL + '/resources';

export enum PAGE_ROUTES {
  MENU = '/',
  SIGN_IN = '/sign-in',
  SIGN_UP = '/sign-up',
  CHANGE_PASSWORD = '/change-password',
  RECOVER_PASSWORD = '/recover-password',
  PROFILE = '/profile',
  GAME = '/game',
  GAME_PAUSE = '/game-pause',
  GAME_RESULT = '/game-result',
  GAME_SETUP = '/game-setup',
  GAME_DIFFICULT = '/game-difficult',
  LEADER_BOARD = '/leader-board',
  ERROR_BOUNDARY = '/error-boundary',
  FORUM = '/forum',
  FORUM_TOPIC = '/forum/:topicId/:page?',
}
