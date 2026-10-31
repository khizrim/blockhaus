import express, { Router } from 'express';

import { commentRouter } from './comment';
import { replyRouter } from './reply';
import { topicRouter } from './topic';
import { checkAuthMiddleware } from '../middlewares/check-auth';
import { errorHandlerMiddleware } from '../middlewares/error-handler';
import { setupSwagger } from '../utils';

export const apiRouter = Router();

apiRouter.use(express.json());
setupSwagger(apiRouter);
apiRouter.use(checkAuthMiddleware);

apiRouter.use('/topics', topicRouter);
apiRouter.use('/comments', commentRouter);

apiRouter.use('/replies', replyRouter);
apiRouter.use(errorHandlerMiddleware);
