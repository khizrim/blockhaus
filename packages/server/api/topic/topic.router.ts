import { Router } from 'express';

import { TopicController } from './topic.controller';

export const topicRouter = Router();

topicRouter.post('/', TopicController.createTopic);
topicRouter.get('/', TopicController.getTopics);
topicRouter.get('/:id', TopicController.getTopic);
topicRouter.put('/:id', TopicController.updateTopic);
topicRouter.delete('/:id', TopicController.deleteTopic);
