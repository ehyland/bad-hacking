import type { Express } from 'express';
import * as vite from 'vite';
import type { CreateAppArgs } from './create-app';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AnyModule = any;

export async function startDevServer(args: {
  importPaths: {
    expressApp: string;
    getLoadContext: string;
  };
}) {
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
  });

  const loadBuild = () =>
    viteDevServer.ssrLoadModule('virtual:remix/server-build') as AnyModule;

  const getLoadContext = async () => {
    const module = await viteDevServer.ssrLoadModule(
      args.importPaths.getLoadContext,
    );
    return module.getLoadContext();
  };

  const { default: startApp } = await viteDevServer.ssrLoadModule(
    args.importPaths.expressApp,
  );

  startApp({
    build: loadBuild,
    getLoadContext: getLoadContext,
    registerAssetMiddleware: (app: Express) => {
      app.use(viteDevServer.middlewares);
    },
  } satisfies CreateAppArgs);
}
