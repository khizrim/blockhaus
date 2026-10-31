import * as fs from 'fs';
import * as path from 'path';

import type { NextFunction, Request, Response } from 'express';
import jsesc from 'jsesc';
import type { ViteDevServer } from 'vite';

import { isDev } from '../utils';

interface SSR {
  render: (
    req: Request,
    res: Response
  ) => Promise<{ html: string; preloadedState: Record<string, unknown> }>;
}

interface SSRRouteOptions {
  vite: ViteDevServer | undefined;
  distPath: string;
  srcPath: string;
}

export function ssrRoute(options: SSRRouteOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { vite, distPath, srcPath } = options;
    const ssrPath = require.resolve('client/dist-ssr/ssr.cjs');
    const url = req.originalUrl;

    try {
      let template: string;
      let ssr: SSR;

      if (isDev && vite) {
        template = fs.readFileSync(
          path.resolve(srcPath, 'index.html'),
          'utf-8'
        );
        template = await vite.transformIndexHtml(url, template);
        ssr = (await vite.ssrLoadModule(
          path.resolve(srcPath, 'ssr.tsx')
        )) as SSR;
      } else {
        template = fs.readFileSync(
          path.resolve(distPath, 'index.html'),
          'utf-8'
        );
        ssr = await import(ssrPath);
      }

      const { html, preloadedState } = await ssr.render(req, res);

      res
        .status(200)
        .set({ 'Content-Type': 'text/html' })
        .send(
          template.replace(`<!--ssr-outlet-->`, html).replace(
            '<!--preloaded-state-->',
            jsesc(JSON.stringify(preloadedState), {
              json: true,
              isScriptContext: true,
            })
          )
        );
    } catch (error) {
      if (isDev && vite) {
        vite.ssrFixStacktrace(error as Error);
      }
      next(error);
    }
  };
}
