import type { TErrorFn, TFindUserRequest, TUser, TUserPasswordRequest } from 'src/shared/types/user';

import { getResponseOrThrow } from 'src/utils/get-response-or-throw';

import BaseAPI from './base-api';

export default class UserAPI extends BaseAPI {
  changePassword(data: TUserPasswordRequest, cb: () => void, errorCb: TErrorFn): Promise<unknown> {
    return this.put<TUserPasswordRequest>('/user/password', data)
      .then(() => cb())
      .catch(errorCb);
  }

  searchUsers(data: TFindUserRequest, cb: (users: TUser[]) => void, errorCb: TErrorFn): Promise<unknown> {
    return this.post<TFindUserRequest>('/user/search', data)
      .then(async response => await (await getResponseOrThrow(response)).json())
      .then(cb)
      .catch(errorCb);
  }
}
