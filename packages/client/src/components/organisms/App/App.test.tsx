import { render, screen } from '@testing-library/react';

import { Provider } from 'react-redux';

import { createBrowserRouter } from 'react-router-dom';

import { routes } from 'src/router';
import { createStore } from 'src/store';

import { App } from './App';

describe('App', () => {
  it('should render', () => {
    const store = createStore();
    const router = createBrowserRouter(routes);
    render(
      <Provider store={store}>
        <App router={router} />
      </Provider>
    );
    expect(screen.getByText(/ade in 2024 by/i)).toBeInTheDocument();
  });
});
