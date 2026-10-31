import type { CommentProps } from 'src/components/molecules/Comment';

export type TopicProps = {
  id: number;
  name: string;
  text?: string;
  userId: number;
  comments?: CommentProps[];
  commentsCount: number;
};

export type TopicCardProps = Pick<TopicProps, 'id' | 'name' | 'text' | 'commentsCount'>;

export type TopicCardsProps = TopicCardProps[];
