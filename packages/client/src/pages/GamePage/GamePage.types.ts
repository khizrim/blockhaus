export type TPos = {
  x: number;
  y: number;
};

export type TRectClickHandler = {
  // left-top corner
  x1: number;
  y1: number;

  // right-bottom corner
  x2: number;
  y2: number;

  handler: () => void;
};

export type TFigure = {
  num: number;
  x: number;
  y: number;
  moveX: number;
  moveY: number;
  shiftX: number;
  shiftY: number;
  width: number;
  height: number;
};
