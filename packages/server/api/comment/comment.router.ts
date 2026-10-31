import { Router } from 'express';

import { CommentController } from './comment.controller';

export const commentRouter = Router();

commentRouter.get('/topic/:topicId', CommentController.getCommentsByTopicId);
commentRouter.post('/topic/:topicId', CommentController.createComment);

commentRouter.get('/:id', CommentController.getComment);
commentRouter.put('/:id', CommentController.updateComment);
commentRouter.delete('/:id', CommentController.deleteComment);
