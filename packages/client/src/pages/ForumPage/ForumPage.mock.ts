import type { TopicCardsProps } from 'src/components/molecules/TopicCard';

export const mockTopics: TopicCardsProps = [
  {
    id: 1,
    name: 'General Discussion',
    text: 'Welcome to the General Discussion thread. Feel free to talk about anything related to our platform here.',
    commentsCount: 34,
  },
  {
    id: 2,
    name: 'Announcements',
    commentsCount: 12,
  },
  {
    id: 3,
    name: 'Off-Topic',
    commentsCount: 8,
  },
  {
    id: 4,
    name: 'Feedback & Suggestions',
    text: 'Share your thoughts and feedback with developers to improve gaming experience.',
    commentsCount: 5,
  },
  {
    id: 5,
    name: 'Technical Support',
    commentsCount: 22,
  },
];
