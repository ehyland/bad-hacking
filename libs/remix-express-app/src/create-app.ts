import type { GetLoadContextFunction } from '@remix-run/express';
import type { ServerBuild } from '@remix-run/node';
import type { Express } from 'express';

export type CreateAppArgs = {
  build: ServerBuild | (() => Promise<ServerBuild>);
  registerAssetMiddleware: (app: Express) => void;
  getLoadContext: GetLoadContextFunction;
};

type CreateAppFn = (args: CreateAppArgs) => unknown;

export function createApp(fn: CreateAppFn) {
  return fn;
}
