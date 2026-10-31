import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { useDispatch } from 'react-redux';

import { api } from './features';
import exampleReducer from './slice';

const rootReducer = combineReducers({
  example: exampleReducer,
  [api.reducerPath]: api.reducer,
});

export function createStore() {
  const preloadedState = typeof window !== 'undefined' ? window.__PRELOADED_STATE__ : undefined;

  if (preloadedState) {
    delete window.__PRELOADED_STATE__;
  }

  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(api.middleware),
    preloadedState,
  });

  setupListeners(store.dispatch);

  return store;
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ReturnType<typeof createStore>['dispatch'];
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
