import type { RequestHandler } from 'express';

import { createTopicDto } from './topic.dto';
import { TopicService } from './topic.service';

export class TopicController {
  /**
   * @swagger
   * /topics:
   *   post:
   *     summary: Create new topic
   *     tags: [Topic]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTopic'
   *     responses:
   *       201:
   *         description: Topic created
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  static createTopic: RequestHandler = async (req, res, next) => {
    const user = res.locals.user;
    const validation = createTopicDto.safeParse({
      userId: user.id,
      ...req.body,
    });

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const topic = await TopicService.createTopic(validation.data);
      return res.status(201).json(topic);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /topics:
   *   get:
   *     summary: Get all topics
   *     tags: [Topic]
   *     responses:
   *       200:
   *         description: List of topics
   *       500:
   *         description: Internal server error
   */
  static getTopics: RequestHandler = async (_, res, next) => {
    try {
      const topics = await TopicService.getTopics();
      res.status(200).json(topics);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @swagger
   * /topics/{id}:
   *   get:
   *     summary: Get a topic by ID
   *     tags: [Topic]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Topic ID
   *     responses:
   *       200:
   *         description: Topic details
   *       400:
   *         description: Invalid topic ID
   *       404:
   *         description: Topic not found
   *       500:
   *         description: Internal server error
   */
  static getTopic: RequestHandler = async (req, res, next) => {
    const topicId = Number(req.params.id);

    if (isNaN(topicId)) {
      return res.status(400).json({ reason: 'Invalid topic ID' });
    }

    try {
      const topic = await TopicService.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ reason: 'Topic not found' });
      }
      return res.status(200).json(topic);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /topics/{id}:
   *   put:
   *     summary: Update a topic by ID
   *     tags: [Topic]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Topic ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTopic'
   *     responses:
   *       200:
   *         description: Topic details
   *       400:
   *         description: Validation error
   *       404:
   *         description: Topic not found
   *       403:
   *         description: You don't have permission to update this topic
   *       500:
   *         description: Internal server error
   */
  static updateTopic: RequestHandler = async (req, res, next) => {
    const topicId = Number(req.params.id);
    const validation = createTopicDto
      .omit({ userId: true })
      .safeParse(req.body);
    const user = res.locals.user;

    if (isNaN(topicId)) {
      return res.status(400).json({ reason: 'Invalid topic ID' });
    }

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const updatedTopic = await TopicService.updateTopic(
        topicId,
        validation.data,
        user.id
      );
      return res.status(200).json(updatedTopic);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /topics/{id}:
   *   delete:
   *     summary: Delete a topic by ID
   *     tags: [Topic]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Topic ID
   *     responses:
   *       200:
   *         description: Ok
   *       400:
   *         description: Validation error
   *       404:
   *         description: Topic not found
   *       403:
   *         description: You don't have permission to delete this topic
   *       500:
   *         description: Internal server error
   */
  static deleteTopic: RequestHandler = async (req, res, next) => {
    const topicId = Number(req.params.id);
    const user = res.locals.user;

    if (isNaN(topicId)) {
      return res.status(400).json({ reason: 'Invalid topic ID' });
    }
    try {
      const deletedTopic = await TopicService.deleteTopic(topicId, user.id);
      return res.status(200).json(deletedTopic);
    } catch (e) {
      return next(e);
    }
  };
}
