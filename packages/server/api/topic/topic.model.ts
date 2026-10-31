import {
  Model,
  Table,
  DataType,
  Column,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import type { CreateTopicDto } from './topic.dto';
import { CommentModel } from '../comment';
import { UserModel } from '../user';

@Table({ tableName: 'topics' })
export class TopicModel extends Model<TopicModel, CreateTopicDto> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    unique: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @BelongsTo(() => UserModel)
  user: UserModel;

  @HasMany(() => CommentModel)
  comments: CommentModel[];
}
