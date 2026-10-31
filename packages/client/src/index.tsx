import React from 'react';

import ReactDOM from 'react-dom/client';

import { Provider } from 'react-redux';

import { createBrowserRouter } from 'react-router-dom';

import { App } from 'src/components/organisms/App';
import { routes } from 'src/router';
import { createStore } from 'src/store';

import './index.css';

const store = createStore();
const router = createBrowserRouter(routes);

const root = document.getElementById('root') as HTMLElement;

const app = (
  <React.StrictMode>
    <Provider store={store}>
      <App router={router} />
    </Provider>
  </React.StrictMode>
);

if (root.innerHTML === '<!--ssr-outlet-->') {
  ReactDOM.createRoot(root).render(app);
} else {
  ReactDOM.hydrateRoot(root, app);
}
