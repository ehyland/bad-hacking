import type { Express } from 'express';
import * as vite from 'vite';

export async function startDevServer(args: { expressAppImportPath: string }) {
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
  });

  const loadBuild = () =>
    viteDevServer.ssrLoadModule('virtual:remix/server-build');

  const { default: startApp } = await viteDevServer.ssrLoadModule(
    args.expressAppImportPath,
  );

  startApp({
    build: loadBuild,
    registerAssetMiddleware: (app: Express) => {
      app.use(viteDevServer.middlewares);
    },
  });
}
