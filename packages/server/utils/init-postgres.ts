import dotenv from 'dotenv';

import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';

import { logger } from './logger';
import { CommentModel } from '../api/comment';
import { ReplyModel } from '../api/reply';
import { TopicModel } from '../api/topic';
import { UserModel } from '../api/user';

dotenv.config({ path: '../../.env' });
const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT } = process.env;

export const initPostgres = async (): Promise<Sequelize | null> => {
  try {
    const sequelize = new Sequelize({
      host: 'localhost',
      port: Number(POSTGRES_PORT),
      username: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_DB,
      dialect: 'postgres',
      logging: false,
      models: [TopicModel, CommentModel, ReplyModel, UserModel],
    });
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info('All models were synchronized successfully.');
    return sequelize;
  } catch (e) {
    logger.error(e);
  }
  return null;
};
