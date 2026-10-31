import type { TErrorFn } from 'src/shared/types/user';

import { getResponseOrThrow } from 'src/utils/get-response-or-throw';

import BaseAPI from './base-api';

type TResp = (p: Response) => void;

const teamName = 'friday-night-push';

export default class LeaderboardAPI extends BaseAPI {
  getLeaderboard(cb: (u: any) => void, errorCb: TErrorFn): Promise<unknown> {
    const body = { ratingFieldName: 'score', cursor: 0, limit: 20 };
    console.info(body);

    return this.post<any>(`/leaderboard/${teamName}`, body)
      .then(async response => {
        if (response.status == 401) {
          // unauthorized
          localStorage.removeItem('isAuth');
          return null;
        }
        return await (await getResponseOrThrow(response)).json();
      })
      .then(cb)
      .catch((e: Error) => {
        console.info(e);
        errorCb(e);
      });
  }

  addToLeaderboard(data: any, cb: TResp, errorCb: TErrorFn): Promise<unknown> {
    const body = { data, ratingFieldName: 'score', teamName };
    console.info(`addToLeaderboard ${JSON.stringify(body)}`);

    return this.post<any>('/leaderboard', body)
      .then(response => getResponseOrThrow(response))
      .then(cb)
      .catch(errorCb);
  }
}
