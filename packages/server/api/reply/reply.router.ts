import { Router } from 'express';

import { ReplyController } from './reply.controller';

export const replyRouter = Router();

replyRouter.get('/comment/:commentId', ReplyController.getRepliesByCommendId);
replyRouter.post('/comment/:commentId', ReplyController.createReply);

replyRouter.get('/:id', ReplyController.getReply);
replyRouter.put('/:id', ReplyController.updateReply);
replyRouter.delete('/:id', ReplyController.deleteReply);
