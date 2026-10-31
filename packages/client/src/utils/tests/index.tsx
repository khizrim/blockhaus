import type { ReactElement } from 'react';
import React from 'react';

import { ThemeProvider } from '@gravity-ui/uikit';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { BrowserRouter } from 'react-router-dom';

import { createStore } from 'src/store';

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const store = createStore();
  const user = userEvent.setup();

  return {
    user,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme='light'>
          <BrowserRouter>{ui}</BrowserRouter>
        </ThemeProvider>
      </Provider>,
      options
    ),
  };
};

export * from '@testing-library/react';
export { customRender as render };
