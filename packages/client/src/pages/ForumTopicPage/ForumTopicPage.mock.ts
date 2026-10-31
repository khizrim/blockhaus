import type { CommentProps } from 'src/components/molecules/Comment';
import type { TopicProps } from 'src/components/molecules/TopicCard';

const mockComments: CommentProps[] = [
  {
    id: 1,
    content:
      'I totally agree with the main point made in this topic, it’s insightful and well-argued. However, I think there’s more to consider in terms of the implications.',
    topicId: 101,
    parentCommentId: null,
    userId: 22,
    time: new Date('2024-09-10T14:35:00Z'),
  },
  {
    id: 2,
    content:
      "Great point! I also believe the situation is more complex. For example, the economic factors weren't fully addressed.",
    topicId: 101,
    parentCommentId: 1,
    userId: 33,
    time: new Date('2024-09-10T15:10:00Z'),
  },
  {
    id: 3,
    content: "The economic aspects are important, but let's not forget the social impacts this issue could have.",
    topicId: 101,
    parentCommentId: 1,
    userId: 22,
    time: new Date('2024-09-10T16:00:00Z'),
  },
  {
    id: 4,
    content:
      "I'm really glad to see this discussion taking off. What are your thoughts on how this could affect legislation?",
    topicId: 101,
    parentCommentId: null,
    userId: 44,
    time: new Date('2024-09-10T17:25:00Z'),
  },
  {
    id: 5,
    content:
      'I don’t think there will be immediate legislative changes, but this could spark more conversations among policymakers.',
    topicId: 101,
    parentCommentId: 4,
    userId: 55,
    time: new Date('2024-09-10T18:05:00Z'),
  },
  {
    id: 6,
    content:
      'This is a great example of how public opinion can shape future regulations. We should watch this space closely.',
    topicId: 101,
    parentCommentId: 4,
    userId: 44,
    time: new Date('2024-09-10T19:45:00Z'),
  },
  {
    id: 7,
    content:
      'Has anyone thought about how technological advancements might change this whole conversation in the next few years?',
    topicId: 101,
    parentCommentId: null,
    userId: 66,
    time: new Date('2024-09-11T10:15:00Z'),
  },
  {
    id: 8,
    content:
      'Technology will definitely play a role, especially with automation becoming more prevalent in the industry.',
    topicId: 101,
    parentCommentId: 7,
    userId: 33,
    time: new Date('2024-09-11T11:45:00Z'),
  },
  {
    id: 9,
    content: 'We should also be considering the ethical concerns that come with rapid technological change.',
    topicId: 101,
    parentCommentId: 7,
    userId: 66,
    time: new Date('2024-09-11T12:30:00Z'),
  },
  {
    id: 10,
    content: "Definitely, ethical considerations are paramount. There's a lot we still need to think through.",
    topicId: 101,
    parentCommentId: 7,
    userId: 22,
    time: new Date('2024-09-11T13:00:00Z'),
  },
  {
    id: 11,
    content:
      'Just wanted to chime in and say this discussion has been really enlightening. Thanks for sharing your thoughts, everyone!',
    topicId: 101,
    parentCommentId: null,
    userId: 77,
    time: new Date('2024-09-11T14:30:00Z'),
  },
  {
    id: 12,
    content:
      'I have been following this thread, and it’s refreshing to see such an intelligent and polite discussion. Keep it up!',
    topicId: 101,
    parentCommentId: 11,
    userId: 88,
    time: new Date('2024-09-11T15:10:00Z'),
  },
  {
    id: 13,
    content: 'One thing I want to bring up is how global markets will react. Could this have a ripple effect?',
    topicId: 101,
    parentCommentId: null,
    userId: 99,
    time: new Date('2024-09-11T16:45:00Z'),
  },
  {
    id: 14,
    content:
      'Good question. The ripple effect is definitely something to monitor. We may see some regions adopt regulations faster than others.',
    topicId: 101,
    parentCommentId: 13,
    userId: 55,
    time: new Date('2024-09-11T17:30:00Z'),
  },
  {
    id: 15,
    content:
      'If we see different markets moving at different speeds, that could cause regulatory fragmentation, which would be a huge challenge.',
    topicId: 101,
    parentCommentId: 13,
    userId: 44,
    time: new Date('2024-09-11T18:00:00Z'),
  },
  {
    id: 16,
    content:
      'Fragmentation would indeed be problematic, especially for companies operating globally. It would increase compliance costs.',
    topicId: 101,
    parentCommentId: 13,
    userId: 33,
    time: new Date('2024-09-11T18:45:00Z'),
  },
  {
    id: 17,
    content:
      'That’s where industry collaboration could help. Maybe companies will push for more unified global standards.',
    topicId: 101,
    parentCommentId: 13,
    userId: 22,
    time: new Date('2024-09-11T19:30:00Z'),
  },
  {
    id: 18,
    content:
      'Do you think governments will get on board with unified standards, though? It feels like there will be resistance.',
    topicId: 101,
    parentCommentId: 13,
    userId: 99,
    time: new Date('2024-09-11T20:10:00Z'),
  },
  {
    id: 19,
    content:
      'There will always be some resistance, but global trade pressures might push some governments towards cooperation.',
    topicId: 101,
    parentCommentId: 13,
    userId: 55,
    time: new Date('2024-09-11T21:00:00Z'),
  },
  {
    id: 20,
    content:
      'This topic is going to be important for years to come. I think we should keep a close eye on these developments.',
    topicId: 101,
    parentCommentId: null,
    userId: 66,
    time: new Date('2024-09-12T09:00:00Z'),
  },
  {
    id: 21,
    content: "Absolutely! It's the kind of issue that could define the next decade in this space.",
    topicId: 101,
    parentCommentId: 20,
    userId: 44,
    time: new Date('2024-09-12T10:00:00Z'),
  },
  {
    id: 22,
    content:
      'To wrap up, I just want to say thanks to everyone for making this thread one of the most engaging discussions on the forum.',
    topicId: 101,
    parentCommentId: null,
    userId: 77,
    time: new Date('2024-09-12T12:30:00Z'),
  },
];

export const mockTopic: TopicProps = {
  id: 1,
  name: 'General Discussion',
  text: 'Welcome to the General Discussion thread. Feel free to talk about anything related to our platform here.',
  userId: 1001,
  comments: [...mockComments],
  commentsCount: 0,
};
