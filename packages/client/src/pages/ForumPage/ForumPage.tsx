import { Text } from '@gravity-ui/uikit';
import type { LoaderFunction } from 'react-router-dom';
import { useLoaderData } from 'react-router-dom';

import { Container } from 'src/components/atoms/Container';
import type { TopicCardsProps, TopicProps } from 'src/components/molecules/TopicCard';
import { TopicCard } from 'src/components/molecules/TopicCard';

import { TopicForm } from 'src/components/molecules/TopicForm';
import { mockTopics } from 'src/pages/ForumPage/ForumPage.mock';

export const topicsLoader: LoaderFunction = async (): Promise<TopicCardsProps> => {
  return mockTopics;
};

export const ForumPage = () => {
  const topics = useLoaderData() as TopicCardsProps;

  const handleSubmit = async (data: TopicProps) => {
    console.log(data);
  };

  return (
    <Container spacing={{ px: 4 }} direction='column' grow gap={5} maxWidth='580px'>
      <Container direction='column' gap={2} style={{ textAlign: 'center' }}>
        <Text variant='subheader-1'>Join the Conversation: Share Your Achievements, Tactics, and Game Insights!</Text>
        <Text variant='body-1'>
          Welcome to the hub to connect, compete, and collaborate. Dive into discussions, explore strategies, and share
          your latest victories with a community!
        </Text>
      </Container>{' '}
      <TopicForm onSubmit={handleSubmit} />
      <Container direction='column' gap={2}>
        {topics.map(topic => (
          <TopicCard key={topic.id} {...topic} />
        ))}
      </Container>
    </Container>
  );
};
