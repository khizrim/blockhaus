import type { CreateCommentDto } from './comment.dto';
import { CommentModel } from './comment.model';
import { ForbiddenError, NotFoundError } from '../../utils';
import { UserModel } from '../user';

export class CommentService {
  static async createComment(createData: CreateCommentDto) {
    return await CommentModel.create(createData);
  }

  static async getCommentsByTopicId(topicId: CreateCommentDto['topicId']) {
    return await CommentModel.findAll({
      where: {
        topicId,
      },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [
            'id',
            'first_name',
            'second_name',
            'display_name',
            'avatar',
          ],
        },
      ],
    });
  }

  static async getComment(id: number) {
    return await CommentModel.findByPk(id, {
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: [
            'id',
            'first_name',
            'second_name',
            'display_name',
            'avatar',
          ],
        },
      ],
    });
  }

  static async updateComment(
    id: number,
    updateData: Partial<CreateCommentDto>,
    userId: number
  ) {
    const comment = await CommentModel.findByPk(id);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError(
        `You don't have permission to update this comment`
      );
    }

    return await comment.update(updateData);
  }

  static async deleteComment(id: number, userId: number) {
    const comment = await CommentModel.findByPk(id);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError(
        `You don't have permission to delete this comment`
      );
    }

    return await comment.destroy();
  }
}
