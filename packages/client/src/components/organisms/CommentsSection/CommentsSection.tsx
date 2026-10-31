import React from 'react';

import { Container } from 'src/components/atoms/Container';
import type { CommentProps } from 'src/components/molecules/Comment';
import { Comment } from 'src/components/molecules/Comment';
import { CommentReply } from 'src/components/molecules/CommentReply';

export type CommentsSectionProps = {
  comments: CommentProps[];
};

export const CommentsSection = ({ comments }: CommentsSectionProps) => {
  return (
    <Container direction='column' gap={4}>
      {comments.map(comment => (
        <Container key={comment.id} direction='column' gap={2}>
          <Comment {...comment} />
        </Container>
      ))}
      <CommentReply parentId={null} />
    </Container>
  );
};
