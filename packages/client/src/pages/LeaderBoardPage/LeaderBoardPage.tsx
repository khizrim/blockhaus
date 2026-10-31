import { useEffect, useState } from 'react';

import { ClockArrowRotateLeft } from '@gravity-ui/icons';
import { Arrows3RotateLeft } from '@gravity-ui/icons';

import { Text } from '@gravity-ui/uikit';

import { Container } from 'src/components/atoms/Container';
import { Page } from 'src/components/organisms/Page';

import LeaderboardAPI from '../../services/api/leaderboard-api';

const lbApi = new LeaderboardAPI();

export const LeaderBoardPage = () => {
  const [showLb, setShowLb] = useState(false);
  const [lb, setLb] = useState<any[]>([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      await lbApi.getLeaderboard(updateLb, (err: Error) => {
        console.error(err);
        setShowLb(false);
      });
    };

    loadLeaderboard();
  }, []);

  const updateLb = (data: any) => {
    setShowLb(data.length > 0);
    let key = 1;
    const lbdata = data.map((d: any) => {
      return { ...d.data, id: key++ };
    });
    setLb(lbdata);
  };

  const getDiff = (diff: number) => {
    switch (diff) {
      case 7:
        return 'Easy';
      case 5:
        return 'Medium';
      case 3:
        return 'Hard';
      case 1:
        return 'Nightmare';
      default:
        return null;
    }
  };

  return (
    <Page title='Leaderboards' withHeader hasBackButton isFullWidth>
      <Container direction='column' alignItems='center' width='100%' gap={8} grow>
        <Container direction='column' gap={2}>
          {showLb && (
            <Container key={10000} alignItems='center' width='440px' justifyContent='space-between'>
              <div style={{ width: '200px', fontWeight: 'bold', fontSize: '20px' }}>User name</div>
              <Text variant='subheader-3'>Score</Text>
              <Text variant='subheader-3'>Diff</Text>
              <Text variant='subheader-3'>Type</Text>
            </Container>
          )}
          {showLb &&
            lb.map(user => (
              <Container key={user.id} alignItems='center' width='440px' justifyContent='space-between'>
                <div style={{ width: '200px', fontWeight: 'bold', fontSize: '20px' }}>{user.name}</div>
                <Text variant='subheader-3'>{user.score}</Text>
                <Text variant='subheader-3'>{getDiff(user.diff)}</Text>
                <Text variant='subheader-3'>{user.type == '0' ? <ClockArrowRotateLeft /> : <Arrows3RotateLeft />}</Text>
              </Container>
            ))}
          {!showLb && <Text variant='subheader-1'>No leaderboard data</Text>}
        </Container>
      </Container>
    </Page>
  );
};
