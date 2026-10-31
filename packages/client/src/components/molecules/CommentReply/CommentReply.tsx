import React, { useState } from 'react';

import { Text, TextArea } from '@gravity-ui/uikit';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';

import type { Nullable } from 'src/shared/types/global';

import { useGetUserQuery } from 'src/store/features';
import { PAGE_ROUTES } from 'src/utils/constants';

type CommentReplyProps = {
  parentId: Nullable<number>;
  onCancel?: () => void;
};

export const CommentReply: React.FC<CommentReplyProps> = ({ parentId, onCancel }) => {
  const { data: user } = useGetUserQuery();

  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = () => {
    console.log(`Comment with message was submit: ${replyContent}`);

    if (parentId) {
      console.log(`Parent ID: ${parentId}`);
    }
  };

  const handleCancel = () => {
    onCancel && onCancel();
    setReplyContent('');
  };

  return (
    <Container direction='column' gap={2}>
      {user && user.id ? (
        <>
          <TextArea
            placeholder='Write a reply...'
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            rows={3}
            style={{ width: '100%' }}
          />
          <Container justifyContent='flex-end' gap={2}>
            <Button view='flat' size='s' onClick={handleCancel}>
              Cancel
            </Button>
            <Button view='action' size='s' onClick={handleSubmit}>
              Submit Reply
            </Button>
          </Container>
        </>
      ) : (
        <Container justifyContent='space-between' alignItems='center' gap={2}>
          <Text>You should sign in to leave comments</Text>
          <Button view='action' isNavigate navigateTo={PAGE_ROUTES.SIGN_IN}>
            Sign in
          </Button>
        </Container>
      )}
    </Container>
  );
};
