import type { CreateReplyDto } from './reply.dto';
import { ReplyModel } from './reply.model';
import { NotFoundError } from '../../utils';
import { CommentModel } from '../comment';
import { UserModel } from '../user';

export class ReplyService {
  static async createReply(createData: CreateReplyDto) {
    const comment = await CommentModel.findByPk(createData.commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    return await ReplyModel.create(createData);
  }

  static async getRepliesByCommentId(commentId: CreateReplyDto['commentId']) {
    return await ReplyModel.findAll({
      where: {
        commentId,
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

  static async getReply(id: number) {
    return await ReplyModel.findByPk(id, {
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

  static async updateReply(id: number, updateData: Partial<CreateReplyDto>) {
    const reply = await ReplyModel.findByPk(id);

    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    return await reply.update(updateData);
  }

  static async deleteReply(id: number) {
    const reply = await ReplyModel.findByPk(id);

    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    return await reply.destroy();
  }
}
