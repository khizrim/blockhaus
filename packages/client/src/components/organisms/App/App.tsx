import React from 'react';

import { ThemeProvider } from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import type { createBrowserRouter } from 'react-router-dom';
import { RouterProvider } from 'react-router-dom';

interface AppProps {
  router: ReturnType<typeof createBrowserRouter>;
}

export const App = ({ router }: AppProps) => (
  <ThemeProvider theme='light'>
    <RouterProvider router={router} />
  </ThemeProvider>
);
