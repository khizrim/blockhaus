export type TLeaderBoard = {
  id: number;
  name: string;
  score: number;
};

export const LEADERBOARD_MOCK: TLeaderBoard[] = [
  {
    id: 1,
    name: 'John',
    score: 100,
  },
  {
    id: 2,
    name: 'Jane',
    score: 90,
  },
  {
    id: 3,
    name: 'Jack',
    score: 80,
  },
];
