import type { RequestHandler } from 'express';

import { createCommentDto } from './comment.dto';
import { CommentService } from './comment.service';

export class CommentController {
  /**
   * @swagger
   * /comments/topic/{topicId}:
   *   post:
   *     summary: Create a new comment for a topic
   *     tags: [Comment]
   *     parameters:
   *       - in: path
   *         name: topicId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the topic to comment on
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateComment'
   *     responses:
   *       201:
   *         description: Comment created
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  static createComment: RequestHandler = async (req, res, next) => {
    const user = res.locals.user;
    const topicId = Number(req.params.topicId);
    const validation = createCommentDto.safeParse({
      topicId,
      userId: user.id,
      ...req.body,
    });

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const comment = await CommentService.createComment(validation.data);
      return res.status(201).json(comment);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /comments/topic/{topicId}:
   *   get:
   *     summary: Get all comments for a topic
   *     tags: [Comment]
   *     parameters:
   *       - in: path
   *         name: topicId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the topic to get comments for
   *     responses:
   *       200:
   *         description: List of comments
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  static getCommentsByTopicId: RequestHandler = async (req, res, next) => {
    const validation = createCommentDto
      .pick({ topicId: true })
      .safeParse({ topicId: Number(req.params.topicId) });

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const comments = await CommentService.getCommentsByTopicId(
        validation.data.topicId
      );
      return res.status(200).json(comments);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /comments/{id}:
   *   get:
   *     summary: Get a comment by ID
   *     tags: [Comment]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the comment to get
   *     responses:
   *       200:
   *         description: Comment details
   *       400:
   *         description: Invalid comment ID
   *       404:
   *         description: Comment not found
   *       500:
   *         description: Internal server error
   */
  static getComment: RequestHandler = async (req, res, next) => {
    const commentId = Number(req.params.id);

    if (isNaN(commentId)) {
      return res.status(400).json({ reason: 'Invalid comment ID' });
    }

    try {
      const comment = await CommentService.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ reason: 'Comment not found' });
      }
      return res.status(200).json(comment);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /comments/{id}:
   *   put:
   *     summary: Update a comment by ID
   *     tags: [Comment]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the comment to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateComment'
   *     responses:
   *       200:
   *         description: Updated comment details
   *       400:
   *         description: Validation error
   *       404:
   *         description: Comment not found
   *       403:
   *         description: You don't have permission to update this comment
   *       500:
   *         description: Internal server error
   */
  static updateComment: RequestHandler = async (req, res, next) => {
    const user = res.locals.user;
    const commentId = Number(req.params.id);
    const validation = createCommentDto.partial().safeParse(req.body);

    if (isNaN(commentId)) {
      return res.status(400).json({ reason: 'Invalid comment ID' });
    }

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const updatedComment = await CommentService.updateComment(
        commentId,
        validation.data,
        user.id
      );
      return res.status(200).json(updatedComment);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /comments/{id}:
   *   delete:
   *     summary: Delete a comment by ID
   *     tags: [Comment]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the comment to delete
   *     responses:
   *       200:
   *         description: Comment deleted
   *       400:
   *         description: Validation error
   *       404:
   *         description: Comment not found
   *       403:
   *         description: You don't have permission to delete this comment
   *       500:
   *         description: Internal server error
   */
  static deleteComment: RequestHandler = async (req, res, next) => {
    const commentId = Number(req.params.id);
    const user = res.locals.user;

    if (isNaN(commentId)) {
      return res.status(400).json({ reason: 'Invalid comment ID' });
    }

    try {
      const deletedComment = await CommentService.deleteComment(
        commentId,
        user.id
      );
      return res.status(200).json(deletedComment);
    } catch (e) {
      return next(e);
    }
  };
}
