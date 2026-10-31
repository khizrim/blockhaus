import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface InitialState {
  gameDifficult: number;
  gameType: number;
}

const initialState: InitialState = {
  gameDifficult: 0,
  gameType: 0,
};

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    setGameDifficult: (state, action: PayloadAction<number>) => {
      state.gameDifficult = action.payload;
    },
    clearGameDifficult: state => {
      state.gameDifficult = 0;
    },

    setGameType: (state, action: PayloadAction<number>) => {
      state.gameType = action.payload;
    },
    clearGameType: state => {
      state.gameType = 0;
    },
  },
});

export const { setGameDifficult, clearGameDifficult, setGameType, clearGameType } = exampleSlice.actions;

export default exampleSlice.reducer;
