import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateComment:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: Comment content
 *       example:
 *         content: "Comment example"
 *
 */

export const createCommentDto = z.object({
  topicId: z
    .number({ message: 'Invalid topic ID' })
    .positive('Topic ID must be positive'),
  content: z
    .string()
    .min(1, 'Comment content must be at least 1 character long')
    .max(600, 'Comment content must be at most 600 characters long'),
  userId: z
    .number({ message: 'Invalid user ID' })
    .positive('User ID must be positive'),
});

export type CreateCommentDto = z.infer<typeof createCommentDto>;
