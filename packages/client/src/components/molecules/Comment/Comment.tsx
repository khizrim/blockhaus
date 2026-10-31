import React, { useState } from 'react';

import { ArrowShapeTurnUpLeft } from '@gravity-ui/icons';
import { Avatar, Card, Icon, Text } from '@gravity-ui/uikit';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';
import { CommentReply } from 'src/components/molecules/CommentReply';
import type { Nullable } from 'src/shared/types/global';

import { useGetUserQuery } from 'src/store/features';

export type CommentProps = {
  id: number;
  content: string;
  topicId: number;
  parentCommentId: Nullable<number>;
  userId: number;
  time: Date;
};

export const Comment = ({ id, content, time, parentCommentId }: CommentProps) => {
  const { data: user } = useGetUserQuery();

  const [isReplying, setIsReplying] = useState(false);

  const formattedTime = new Date(time).toLocaleString('ru-RU');

  const toggleReply = () => {
    setIsReplying(prev => !prev);
  };

  return (
    <Container direction='column' gap={2} spacing={{ ml: parentCommentId ? 4 : 0 }}>
      <Card view='outlined' key={id} type='container' spacing={{ p: 4 }}>
        <Container direction='column' gap={2}>
          <Text variant='body-1'>{content}</Text>
          <Container justifyContent='space-between'>
            <Container alignItems='center'>
              <Avatar size='xs' />
              <Text color='secondary'>{formattedTime}</Text>
            </Container>
            <Button view='flat-secondary' size='s' type='button' disabled={!user} onClick={toggleReply}>
              <Icon data={ArrowShapeTurnUpLeft} />
            </Button>
          </Container>
        </Container>
      </Card>
      {isReplying && <CommentReply parentId={parentCommentId || id} onCancel={toggleReply} />}
    </Container>
  );
};
