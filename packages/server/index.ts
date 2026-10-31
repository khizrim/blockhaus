import * as path from 'path';

import compression from 'compression';
import cors from 'cors';

import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

import { apiRouter } from './api';
import { yaProxyMiddleware } from './middlewares/ya-proxy';
import { ssrRoute } from './ssr';

import { initPostgres, isDev, logger } from './utils';

dotenv.config({ path: '../../.env' });

initPostgres();

async function startServer() {
  const app = express();
  const port = Number(process.env.SERVER_PORT) || 3001;
  const clientPort = Number(process.env.CLIENT_PORT) || 3000;

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );
  app.use(
    cors({
      origin: `http://friday-night-push-blockhau-40.ya-praktikum.tech:${clientPort}`,
      credentials: true,
    })
  );
  app.use(compression());

  app.use('/api/v1/proxy', yaProxyMiddleware);
  app.use('/api/v1', apiRouter);

  let vite: ViteDevServer | undefined;

  const distPath = path.dirname(require.resolve('client/dist/index.html'));
  const srcPath = path.dirname(require.resolve('client/index.html'));

  if (isDev) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      root: srcPath,
      appType: 'custom',
      ssr: {
        noExternal: ['@gravity-ui/uikit'],
      },
    });
    app.use(vite.middlewares);
  } else {
    app.use('/assets', express.static(path.resolve(distPath, 'assets')));
  }

  app.use('*', ssrRoute({ vite, distPath, srcPath }));

  app.listen(port, () => {
    logger.info(`  ➜ 🎸 Server is listening on port: ${port}`);
  });
}

startServer();
