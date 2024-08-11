import type { ServerBuild } from '@remix-run/node';
import type { Express } from 'express';

type CreateAppArgs = {
  build: ServerBuild | (() => Promise<ServerBuild>);
  registerAssetMiddleware: (app: Express) => void;
};

type CreateAppFn = (args: CreateAppArgs) => unknown;

export function createApp(fn: CreateAppFn) {
  return fn;
}
