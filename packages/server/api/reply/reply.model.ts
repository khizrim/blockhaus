import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';

import type { CreateReplyDto } from './reply.dto';
import { CommentModel } from '../comment';
import { UserModel } from '../user';

@Table({ tableName: 'replies' })
export class ReplyModel extends Model<ReplyModel, CreateReplyDto> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    unique: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  content: string;

  @ForeignKey(() => CommentModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  commentId: number;

  @BelongsTo(() => CommentModel)
  comment: CommentModel;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @BelongsTo(() => UserModel)
  user: UserModel;
}
