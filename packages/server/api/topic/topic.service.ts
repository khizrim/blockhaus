import type { CreateTopicDto } from './topic.dto';
import { TopicModel } from './topic.model';
import { ForbiddenError, NotFoundError } from '../../utils';
import { CommentModel } from '../comment';
import { UserModel } from '../user';

export class TopicService {
  static async createTopic(topic: CreateTopicDto) {
    return await TopicModel.create(topic);
  }

  static async getTopics() {
    return await TopicModel.findAll({
      include: [
        {
          model: CommentModel,
          attributes: [],
        },
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
      attributes: {
        include: [
          [
            // eslint-disable-next-line
            TopicModel.sequelize!.fn(
              'COUNT',
              // eslint-disable-next-line
              TopicModel.sequelize!.col('comments.id')
            ),
            'commentCount',
          ],
        ],
      },
      group: ['TopicModel.id', 'user.id'],
    });
  }

  static async getTopic(id: number) {
    return await TopicModel.findByPk(id, {
      include: [
        {
          model: CommentModel,
          attributes: [],
        },
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
      attributes: {
        include: [
          [
            // eslint-disable-next-line
            TopicModel.sequelize!.fn(
              'COUNT',
              // eslint-disable-next-line
              TopicModel.sequelize!.col('comments.id')
            ),
            'commentCount',
          ],
        ],
      },
      group: ['TopicModel.id', 'user.id'],
    });
  }

  static async updateTopic(
    id: number,
    updateData: Omit<CreateTopicDto, 'userId'>,
    userId: number
  ) {
    const topic = await TopicModel.findByPk(id);

    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    if (topic.userId !== userId) {
      throw new ForbiddenError(
        `You don't have permission to update this topic`
      );
    }

    return await topic.update(updateData);
  }

  static async deleteTopic(id: number, userId: number) {
    const topic = await TopicModel.findByPk(id);

    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    if (topic.userId !== userId) {
      throw new ForbiddenError(
        `You don't have permission to delete this topic`
      );
    }

    return await topic.destroy();
  }
}
