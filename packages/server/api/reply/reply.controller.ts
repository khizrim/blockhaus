import type { RequestHandler } from 'express';

import { createReplyDto } from './reply.dto';
import { ReplyService } from './reply.service';

export class ReplyController {
  /**
   * @swagger
   * /replies/comment/{commentId}:
   *   post:
   *     summary: Create a new reply for a comment
   *     tags: [Reply]
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the comment to reply to
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateReply'
   *     responses:
   *       201:
   *         description: Reply created
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  static createReply: RequestHandler = async (req, res, next) => {
    const user = res.locals.user;
    const commentId = Number(req.params.commentId);
    const validation = createReplyDto.safeParse({
      userId: user.id,
      commentId,
      ...req.body,
    });

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const reply = await ReplyService.createReply(validation.data);
      return res.status(201).json(reply);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /replies/comment/{commentId}:
   *   get:
   *     summary: Get all replies for a comment
   *     tags: [Reply]
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the comment to get replies for
   *     responses:
   *       200:
   *         description: List of replies
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  static getRepliesByCommendId: RequestHandler = async (req, res, next) => {
    const validation = createReplyDto.pick({ commentId: true }).safeParse({
      commentId: Number(req.params.commentId),
    });

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const replies = await ReplyService.getRepliesByCommentId(
        validation.data.commentId
      );
      return res.status(200).json(replies);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /replies/{id}:
   *   get:
   *     summary: Get a reply by ID
   *     tags: [Reply]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the reply to get
   *     responses:
   *       200:
   *         description: Reply details
   *       400:
   *         description: Invalid reply ID
   *       500:
   *         description: Internal server error
   */
  static getReply: RequestHandler = async (req, res, next) => {
    const replyId = Number(req.params.id);

    if (isNaN(replyId)) {
      return res.status(400).json({ reason: 'Invalid reply ID' });
    }

    try {
      const reply = await ReplyService.getReply(replyId);
      return res.status(200).json(reply);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /replies/{id}:
   *   put:
   *     summary: Update a reply by ID
   *     tags: [Reply]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the reply to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateReply'
   *     responses:
   *       200:
   *         description: Updated reply details
   *       400:
   *         description: Validation error
   *       404:
   *         description: Reply not found
   *       403:
   *         description: You don't have permission to update this reply
   *       500:
   *         description: Internal server error
   */
  static updateReply: RequestHandler = async (req, res, next) => {
    const replyId = Number(req.params.id);
    const validation = createReplyDto.partial().safeParse(req.body);

    if (isNaN(replyId)) {
      return res.status(400).json({ reason: 'Invalid reply ID' });
    }

    if (!validation.success) {
      return res.status(400).json({ reason: validation.error.errors });
    }

    try {
      const updatedReply = await ReplyService.updateReply(replyId, req.body);
      return res.status(200).json(updatedReply);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @swagger
   * /replies/{id}:
   *   delete:
   *     summary: Delete a reply by ID
   *     tags: [Reply]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the reply to delete
   *     responses:
   *       200:
   *         description: Reply deleted
   *       400:
   *         description: Validation error
   *       404:
   *         description: Reply not found
   *       403:
   *         description: You don't have permission to delete this reply
   *       500:
   *         description: Internal server error
   */
  static deleteReply: RequestHandler = async (req, res, next) => {
    const replyId = Number(req.params.id);

    if (isNaN(replyId)) {
      return res.status(400).json({ reason: 'Invalid reply ID' });
    }

    try {
      const deletedReply = await ReplyService.deleteReply(replyId);
      return res.status(200).json(deletedReply);
    } catch (e) {
      return next(e);
    }
  };
}
