import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils';

export const errorHandlerMiddleware = (err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  console.log(err);
  // eslint-disable-next-line
  const statusCode = (err as any).statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(err);

  res.status(statusCode).json({ reason: message });
};
