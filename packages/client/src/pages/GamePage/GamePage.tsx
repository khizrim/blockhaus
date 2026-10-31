import { useEffect, useRef, useState } from 'react';

import { Button, Modal } from '@gravity-ui/uikit';

import { useSelector } from 'react-redux';

import { useNavigate } from 'react-router-dom';

import LeaderboardAPI from 'src/services/api/leaderboard-api';

import type { RootState } from 'src/store';

import { useGetUserQuery } from 'src/store/features';

import { PAGE_ROUTES } from 'src/utils/constants';

import Game from './Game';

const lbApi = new LeaderboardAPI();

let startTimer: NodeJS.Timeout;
let isFullscreen = false;

export type GamePageProps = {
  toggleFullscreen: (canvasRef: React.RefObject<HTMLCanvasElement>, isFS: boolean) => boolean;
};

export const GamePage: React.FC<GamePageProps> = (props: GamePageProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');

  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { data: user } = useGetUserQuery();

  let game: Game;

  let gameDifficultState = useSelector((state: RootState) => state.example.gameDifficult);
  let gameTypeState = useSelector((state: RootState) => state.example.gameType);

  useEffect(() => {
    console.info('user', user);
    clearTimeout(startTimer);
    startTimer = setTimeout(Initialize, 100);
  }, []);

  function Initialize() {
    const scores = localStorage.getItem('scores');
    const field = localStorage.getItem('field');
    const scoresState = scores ? parseInt(scores) : 0;
    const fieldState = field ? JSON.parse(field) : [];

    const difficult = localStorage.getItem('difficult');
    const type = localStorage.getItem('type');

    gameDifficultState = difficult ? parseInt(difficult) : gameDifficultState;
    gameTypeState = type ? parseInt(type) : gameTypeState;
    localStorage.setItem('difficult', gameDifficultState.toString());
    localStorage.setItem('type', gameTypeState.toString());

    const time = localStorage.getItem('time');

    game = new Game(canvasRef);
    game.Init(scoresState, fieldState);
    game.SetDifficult(gameDifficultState, time == null ? -1 : parseInt(time));
    game.SetType(gameTypeState);
    game.SetPauseHandler(pauseGame);
    game.SetToggleFullscreenHandler(toggleFS);
    game.SetSaveDataHandler(saveData);
    game.SetGameOver(gameOver);
    game.Start();
  }

  function pauseGame() {
    game.PauseGame();
    navigate(PAGE_ROUTES.GAME_PAUSE);
  }

  function toggleFS() {
    isFullscreen = props.toggleFullscreen(canvasRef, isFullscreen);
    game.SetToggleIcon(isFullscreen);
  }

  function saveData(score: number, field: number[], time: number) {
    localStorage.setItem('scores', score.toString());
    localStorage.setItem('time', time.toString());
    localStorage.setItem('field', JSON.stringify(field));
  }

  async function addToLb(data: any) {
    console.info(`addToLb ${JSON.stringify(data)}`);
    await lbApi.addToLeaderboard(
      data,
      () => {
        console.info('---');
      },
      (err: Error) => {
        console.error('addToLeaderboard', err);
      }
    );
  }

  function gameOver(score: number, type: number, diff: number) {
    console.info('user', user);

    let showname = 'Y';
    if (user && user.id) {
      const name = user?.display_name == null ? user?.first_name : user?.display_name;
      showname = name + ', y';

      const data = { name, score, type, diff };
      addToLb(data);
    }

    setContent(`Game over. ${showname}our score is ${score}. Type: ${type}, difficult: ${diff}.`);
    setOpen(true);
  }

  function closeGame() {
    localStorage.removeItem('scores');
    localStorage.removeItem('field');
    localStorage.removeItem('time');
    localStorage.removeItem('type');
    localStorage.removeItem('difficult');
    navigate(PAGE_ROUTES.MENU);
  }

  return (
    <>
      <canvas ref={canvasRef} className='canvas'></canvas>;
      <Modal open={open} onClose={closeGame}>
        <div style={{ padding: '20px' }}>
          {content}
          <hr />
          <Button onClick={closeGame}>Ok</Button>
        </div>
      </Modal>
    </>
  );
};
