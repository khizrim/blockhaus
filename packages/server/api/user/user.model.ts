import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';

import { CommentModel } from '../comment';
import { ReplyModel } from '../reply';
import { TopicModel } from '../topic';

@Table({ tableName: 'users' })
export class UserModel extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  first_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  second_name: string;

  @Column({ type: DataType.STRING })
  display_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  login: string;

  @Column({ type: DataType.STRING })
  avatar: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email: string;

  @Column({ type: DataType.STRING })
  phone: string;

  @HasMany(() => TopicModel)
  topics: TopicModel[];

  @HasMany(() => CommentModel)
  comments: CommentModel[];

  @HasMany(() => ReplyModel)
  replies: ReplyModel[];
}
