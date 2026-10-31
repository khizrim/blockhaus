import { DEFAULT_WIDTH, DEFAULT_HEIGHT, CUBE_SIZES, CUBE_DATAS } from './GamePage.constants';

import type { TFigure } from './GamePage.types';

export class GpFigure {
  //

  public static GenerateFigure(num: number): TFigure {
    const f: TFigure = {
      num,
      x: 0,
      y: 0,
      moveX: 0,
      moveY: 0,
      shiftX: 0,
      shiftY: 0,
      width: 0,
      height: 0,
    };

    f.width = CUBE_SIZES[num].x * DEFAULT_WIDTH;
    f.height = CUBE_SIZES[num].y * DEFAULT_HEIGHT;
    return f;
  }

  public static RandomFigures(centerWinX: number, count: number): TFigure[] {
    const tmp: number[] = [];
    const figures: TFigure[] = [];

    let sum = 0;
    for (let i = 0; i < count; i++) {
      let num = 0;

      do {
        num = Math.floor(Math.random() * CUBE_DATAS.length);
      } while (tmp.includes(num));
      tmp.push(num);

      const figure = this.GenerateFigure(num);
      figure.x = 0;
      figure.y = 600;
      sum = sum + figure.width + 50;

      figures.push(figure);
    }

    function rf(a: number, b: TFigure) {
      return a + b.width + 50;
    }

    let l = 0;
    const figuresShift = (figures.reduce(rf, 0) - 50) / 2;

    figures.forEach((f: TFigure) => {
      f.x = centerWinX + l - figuresShift;
      l += f.width + 50;

      f.moveX = f.x;
      f.moveY = f.y;
    });

    return figures;
  }

  public static UpdateCoordFigures(centerWinX: number, figures: TFigure[], yy = 0) {
    function rf(a: number, b: TFigure) {
      return a + b.width + 50;
    }

    let l = 0;
    const figuresShift = (figures.reduce(rf, 0) - 50) / 2;

    figures.forEach((f: TFigure) => {
      f.y = yy;
      f.x = centerWinX + l - figuresShift;
      l += f.width + 50;

      f.moveX = f.x;
      f.moveY = f.y;
    });

    return figures;
  }

  public static KillRowsAndColumns(field: number[]) {
    const rows: number[] = [];
    const cols: number[] = [];

    // Получаем заполненные колонки
    // столбец
    for (let i = 0; i < 10; i++) {
      // строка
      let fillCol = 0;
      for (let j = 0; j < 10; j++) {
        if (field[i * 10 + j] != 0) fillCol++;
      }

      if (fillCol == 10) {
        cols.push(i);
      }
    }

    // Получаем заполненные строки
    // строка
    for (let j = 0; j < 10; j++) {
      // столбец
      let fillRow = 0;
      for (let i = 0; i < 10; i++) {
        if (field[i * 10 + j] != 0) fillRow++;
      }

      if (fillRow == 10) {
        rows.push(j);
      }
    }

    if (rows.length > 0) {
      for (let row = 0; row < 5; row++) {
        if (rows.indexOf(row) > -1) {
          // строка есть
          for (let j = row; j >= 0; j--) {
            for (let i = 0; i < 10; i++) {
              field[i * 10 + j] = j == 0 ? 0 : field[i * 10 + j - 1];
            }
          }
        }
      }

      for (let row = 9; row > 4; row--) {
        if (rows.indexOf(row) > -1) {
          // строка есть
          for (let j = row; j < 10; j++) {
            for (let i = 0; i < 10; i++) {
              field[i * 10 + j] = j == 9 ? 0 : field[i * 10 + j + 1];
            }
          }
        }
      }
    }

    if (cols.length > 0) {
      for (let col = 0; col < 5; col++) {
        if (cols.indexOf(col) > -1) {
          // строка есть
          for (let i = col; i >= 0; i--) {
            for (let j = 0; j < 10; j++) {
              field[i * 10 + j] = i == 0 ? 0 : field[(i - 1) * 10 + j];
            }
          }
        }
      }

      for (let col = 9; col > 4; col--) {
        if (cols.indexOf(col) > -1) {
          // строка есть
          for (let i = col; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              field[i * 10 + j] = i == 9 ? 0 : field[(i + 1) * 10 + j];
            }
          }
        }
      }
    }
  }

  public static CheckFill(field: number[], figures: TFigure[]) {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (field[j * 10 + i] == 0) {
          // находим пустую клетку
          for (let f = 0; f < figures.length; f++) {
            const figure = figures[f];
            let nasloi = false;
            for (let k = 0; k < 9; k++) {
              if (CUBE_DATAS[figure.num][k] != 0) {
                const sx = k % 3;
                const sy = Math.floor(k / 3);
                if (field[(j + sx) * 10 + (i + sy)] != 0) {
                  nasloi = true;
                }
              }
            }

            if (!nasloi) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
