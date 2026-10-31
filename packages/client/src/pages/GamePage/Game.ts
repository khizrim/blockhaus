import { loadSprites } from 'src/utils/loadSprites';

import {
  SPRITES,
  PAUSE,
  TOGGLE,
  CUBE_DATAS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  SHIFT_HORIZONTAL,
  SHIFT_VERTICAL,
  CUBE_SIZES,
} from './GamePage.constants';

import { GpDraw } from './GamePage.draw';

import { GpFigure } from './GamePage.figure';

import type { TFigure, TRectClickHandler } from './GamePage.types';

export default class Game {
  private canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private canvasWidth = 0;
  private canvasHeight = 0;

  private sprites: Record<string, HTMLImageElement> = {};

  private centerWin: { x: number; y: number } = { x: 0, y: 0 };

  private wField = 0;
  private hField = 0;
  private drawX = 0;
  private drawY = 0;

  private field: number[] = [];
  private selectedField: number[] = [];
  private figures: TFigure[] = [];
  private fieldIsFull = false;

  private score = 0;

  // перетаскивание
  private isDrag = false;
  private dragFigure: TFigure | null = null;
  private putX = 0;
  private putY = 0;

  private isToggleIcon = false;
  private isOnField = false;

  private difficult = 0;
  private difficults: number[] = [7, 5, 3, 1];

  private gameType = 0; // 0 - endless, 1 - race the clock
  private gameTimes: number[] = [0.05, 10, 15, 20];
  private gameTime = 0;
  private gameIsOver = false;
  private gameInPause = false;

  private lasttimestamp = 0;

  private saveDataHandler: (sc: number, fl: number[], tm: number) => void = () => {
    console.info();
  };

  private gameOverHandler: (sc: number, type: number, diff: number) => void = () => {
    console.info();
  };

  // массив объектов, по который будет оцениваться куда кликнули и какой вызывать обработчик
  private CLICK_HANDLERS: TRectClickHandler[] = [];

  constructor(canvasRef: React.MutableRefObject<HTMLCanvasElement | null>) {
    this.canvasRef = canvasRef;
  }

  Init(scores: number, field: number[]) {
    this.score = scores;
    this.field = field;

    this.canvas = this.canvasRef.current;
    if (!this.canvas) throw 'Canvas is null';

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!this.ctx) throw 'Canvas context is null';
  }

  Start() {
    this.addEvents();

    if (this.field.length == 0) this.field = new Array(100).fill(0);
    this.selectedField = new Array(100).fill(-1);

    loadSprites(SPRITES).then((s: Record<string, HTMLImageElement>) => {
      this.sprites = s;
      this.figures = GpFigure.RandomFigures(this.centerWin.x, this.difficult);
      this.resize();
      this.animate();
    });

    this.gameIsOver = false;
    this.gameInPause = false;

    if (this.gameType == 1) {
      console.info('Start race the clock');
    }
  }

  SetPauseHandler(handler: () => void) {
    const rect: TRectClickHandler = {
      x1: PAUSE.x,
      y1: PAUSE.y,
      x2: PAUSE.x + PAUSE.width,
      y2: PAUSE.y + PAUSE.height,
      handler: handler,
    } as TRectClickHandler;
    this.CLICK_HANDLERS.push(rect);
  }

  SetToggleFullscreenHandler(handler: () => void) {
    const rect: TRectClickHandler = {
      x1: TOGGLE.x,
      y1: TOGGLE.y,
      x2: TOGGLE.x + TOGGLE.width,
      y2: TOGGLE.y + TOGGLE.height,
      handler: handler,
    } as TRectClickHandler;
    this.CLICK_HANDLERS.push(rect);
  }

  SetToggleIcon(isFS: boolean) {
    this.isToggleIcon = isFS;
  }

  SetDifficult(gameDifficultState: number, time = -1) {
    this.difficult = this.difficults[gameDifficultState];
    this.gameTime = time >= 0 ? time : this.gameTimes[gameDifficultState] * 60;
  }

  SetType(gameTypeState: number) {
    this.gameType = gameTypeState;
  }

  SetSaveDataHandler(handler: (sc: number, fl: number[], tm: number) => void) {
    this.saveDataHandler = handler;
  }

  SetGameOver(handler: (sc: number, type: number, diff: number) => void) {
    this.gameOverHandler = handler;
  }

  PauseGame() {
    this.gameInPause = true;
  }

  private animate(timestamp = 0) {
    if (!this.gameInPause) {
      if (this.ctx) {
        const delta = timestamp - this.lasttimestamp;

        if (this.gameType == 1) {
          if (this.lasttimestamp != 0 && this.gameType == 1) this.gameTime -= delta / 1000;
          if (this.gameTime <= 0) {
            this.gameIsOver = true;
          }
        }

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.drawImage(this.sprites.BG, 0, 0, this.canvasWidth, this.canvasHeight);

        GpDraw.DrawPause(this.ctx, this.sprites.PAUSE);
        GpDraw.DrawToggle(this.ctx, this.isToggleIcon ? this.sprites.TOGGLEOFF : this.sprites.TOGGLEON);

        GpDraw.DrawField(this.ctx, this.drawX, this.drawY, this.wField, this.hField, this.field);
        GpDraw.DrawField(this.ctx, this.drawX, this.drawY, this.wField, this.hField, this.selectedField, false);

        GpDraw.DrawFigures(this.ctx, this.sprites.CUBES, this.figures);

        GpDraw.DrawScore(this.ctx, this.sprites.COIN, this.score, this.centerWin.x);
        if (this.gameType == 1) GpDraw.DrawTime(this.ctx, this.sprites.COIN, this.gameTime, this.centerWin.x);

        this.lasttimestamp = timestamp;

        this.saveDataHandler(this.score, this.field, this.gameTime);

        if (this.fieldIsFull) {
          this.gameIsOver = true;
        }

        if (this.gameIsOver) {
          this.gameOverHandler(this.score, this.gameType, this.difficult);
        }

        if (!this.gameIsOver) requestAnimationFrame((timestamp: number) => this.animate(timestamp));
      } else console.info('no ctx');
    }
  }

  private addEvents() {
    this.canvasRef.current?.addEventListener('click', (event: MouseEvent) => {
      const x = event.x;
      const y = event.y;
      this.CLICK_HANDLERS.forEach((rch: TRectClickHandler) => {
        if (x >= rch.x1 && x <= rch.x2 && y >= rch.y1 && y <= rch.y2) {
          rch.handler();
        }
      });
    });

    // нажали кнопку мыши
    this.canvasRef.current?.addEventListener('mousedown', (event: MouseEvent) => {
      this.isDrag = true;
      const x = event.x;
      const y = event.y;
      this.figures.forEach((f: TFigure) => {
        if (x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height) {
          this.dragFigure = f;
          this.dragFigure.shiftX = x - this.dragFigure.x;
          this.dragFigure.shiftY = y - this.dragFigure.y;
        }
      });
    });

    // отпустили кнопку мыши
    this.canvasRef.current?.addEventListener('mouseup', () => {
      this.isDrag = false;
      if (this.dragFigure) {
        if (this.isOnField) {
          for (let i = 0; i < 9; i++) {
            if (CUBE_DATAS[this.dragFigure.num][i] != 0) {
              this.score++;
              const sx = i % 3;
              const sy = Math.floor(i / 3);
              this.field[(this.putX + sx) * 10 + (this.putY + sy)] = CUBE_DATAS[this.dragFigure.num][i];
            }
          }
        }

        this.dragFigure.moveX = this.dragFigure.x;
        this.dragFigure.moveY = this.dragFigure.y;
        this.dragFigure = null;

        if (this.isOnField) {
          this.figures = GpFigure.RandomFigures(this.centerWin.x, this.difficult);
          this.resize();
          GpFigure.KillRowsAndColumns(this.field);
          this.fieldIsFull = !GpFigure.CheckFill(this.field, this.figures);
        }
      }
      localStorage.setItem('scores', this.score.toString());
      this.isOnField = false;
    });

    // перемещаем мышкой
    this.canvasRef.current?.addEventListener('mousemove', (event: MouseEvent) => {
      if (this.ctx) {
        this.selectedField = new Array(100).fill(-1);
        if (this.isDrag && this.dragFigure) {
          this.dragFigure.moveX = event.x - this.dragFigure.shiftX;
          this.dragFigure.moveY = event.y - this.dragFigure.shiftY;

          this.isOnField = false;
          const x = this.dragFigure.moveX + 10;
          const y = this.dragFigure.moveY + 10;
          if (
            x >= this.drawX &&
            x <= this.drawX + this.wField - 3 - (CUBE_SIZES[this.dragFigure.num].x - 1) * DEFAULT_WIDTH &&
            y >= this.drawY &&
            y <= this.drawY + this.hField - 3 - (CUBE_SIZES[this.dragFigure.num].y - 1) * DEFAULT_HEIGHT
          ) {
            this.putX = Math.floor((x - this.drawX) / DEFAULT_WIDTH);
            this.putY = Math.floor((y - this.drawY) / DEFAULT_HEIGHT);

            let nasloi = false;
            for (let i = 0; i < 9; i++) {
              if (CUBE_DATAS[this.dragFigure.num][i] != 0) {
                const sx = i % 3;
                const sy = Math.floor(i / 3);
                if (this.field[(this.putX + sx) * 10 + (this.putY + sy)] != 0) {
                  nasloi = true;
                }
              }
            }

            if (!nasloi) {
              for (let i = 0; i < 9; i++) {
                if (CUBE_DATAS[this.dragFigure.num][i] != 0) {
                  const sx = i % 3;
                  const sy = Math.floor(i / 3);
                  if (this.field[(this.putX + sx) * 10 + (this.putY + sy)] == 0)
                    this.selectedField[(this.putX + sx) * 10 + (this.putY + sy)] = 1;
                }
              }
              this.isOnField = true;
            }
          }
        } else {
          if (
            event.x >= this.drawX &&
            event.x <= this.drawX + this.wField - 3 &&
            event.y >= this.drawY &&
            event.y <= this.drawY + this.hField - 3
          ) {
            const indX = Math.floor((event.x - this.drawX) / DEFAULT_WIDTH);
            const indY = Math.floor((event.y - this.drawY) / DEFAULT_HEIGHT);
            if (this.field[indX * 10 + indY] == 0) this.selectedField[indX * 10 + indY] = 1;
          }
        }
      }
    });

    window.onresize = () => {
      this.resize();
    };
  }

  private resize() {
    if (this.canvas) {
      this.canvas.width = document.documentElement.clientWidth;
      this.canvas.height = document.documentElement.clientHeight - 5;
      this.canvasWidth = this.canvas.width;
      this.canvasHeight = this.canvas.height;
      this.centerWin = { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };

      this.wField = 10 * DEFAULT_WIDTH + 2;
      this.hField;
      this.hField = 10 * DEFAULT_HEIGHT + 2;

      this.drawX = this.centerWin.x - this.wField / 2 + SHIFT_HORIZONTAL;
      this.drawY = this.centerWin.y - this.hField / 2 + SHIFT_VERTICAL;

      if (this.gameType == 0 && this.drawY < 70) this.drawY = 70;
      if (this.gameType == 1 && this.drawY < 110) this.drawY = 110;

      this.figures = GpFigure.UpdateCoordFigures(this.centerWin.x, this.figures, this.drawY + this.hField + 20);
    }
  }
}
