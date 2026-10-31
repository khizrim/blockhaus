import React from 'react';

import { ThemeProvider } from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import ReactDOM from 'react-dom/client';

import { OfflinePage } from './pages/OfflinePage';

import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme='light'>
      <OfflinePage />
    </ThemeProvider>
  </React.StrictMode>
);
