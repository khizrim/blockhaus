import { Card, Text } from '@gravity-ui/uikit';

import { useNavigate } from 'react-router-dom';

import { Container } from 'src/components/atoms/Container';

import type { TopicCardProps } from './TopicCard.types';

export const TopicCard = ({ id, name, text, commentsCount }: TopicCardProps) => {
  const navigate = useNavigate();

  const topicPath = `/forum/${id}`;

  return (
    <Card key={id} type='action' spacing={{ p: 4 }} width='100%' onClick={() => navigate(topicPath)}>
      <Container gap={2} alignItems='center' justifyContent='space-between'>
        <Container direction='column'>
          <Text as='h3' variant='header-1' style={{ margin: 0 }}>
            {name}
          </Text>
          {text && <Text variant='body-short'>{text}</Text>}
        </Container>
        <Text as='p' whiteSpace='nowrap' variant='body-short'>
          {commentsCount} messages
        </Text>
      </Container>
    </Card>
  );
};
