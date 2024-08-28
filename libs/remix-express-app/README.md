# Remix Express App <!-- omit in toc -->

✨ Use the same express app in development & production builds.

✨ No additional builds required, fully integrated into the one vite build

✨ Easily start background jobs,

✨ Add additional middleware

✨ Run async tasks before sever starts listening

✨ Listen on a unix socket instead of http port

![](docs/component-diagram.excalidraw.png)

## Usage <!-- omit in toc -->

- [1. Create you express app](#1-create-you-express-app)
- [2. Create your loader context](#2-create-your-loader-context)
- [3. Create your dev server entry file](#3-create-your-dev-server-entry-file)
- [4. Create your production server entry file](#4-create-your-production-server-entry-file)
- [5. Install vite plugin](#5-install-vite-plugin)

### 1. Create you express app

```ts
// app/.server/app.ts

import { createApp } from '@bad-hacking/remix-express-app/create-app';
import { createRequestHandler } from '@remix-run/express';
import express from 'express';

export default createApp(async (args) => {
  const app = express();

  app.disable('x-powered-by');

  // serve built assets
  args.registerAssetMiddleware(app);

  // non hashed assets like favicon
  app.use(express.static('build/client', { maxAge: '1h' }));

  // handle SSR requests
  app.all(
    '*',
    createRequestHandler({
      build: args.build,
      getLoadContext: args.getLoadContext,
    }),
  );

  const port = process.env.PORT || 3000;

  /*
    Do anything you want here 

    await db.connect()
    await backgroundJobs.start()
  */

  app.listen(port, () =>
    console.log(`Express server listening at http://localhost:${port}`),
  );
});
```

### 2. Create your loader context

```ts
// app/.server/get-load-context.ts

import { createStore } from '@bad-hacking/zustand';
import type { AppLoadContext } from '@remix-run/node';
import { type State, type Store, getInitialState } from '~/store/core';

declare module '@remix-run/node' {
  export interface AppLoadContext {
    store: Store;
  }
}

export function getLoadContext(): AppLoadContext {
  return {
    store: createStore<State>(getInitialState()),
  };
}
```

### 3. Create your dev server entry file

```ts
// app/.server/dev-server.js

import { startDevServer } from '@bad-hacking/remix-express-app/dev-server';

startDevServer({
  importPaths: {
    expressApp: 'app/.server/app.ts',
    getLoadContext: 'app/.server/get-load-context.ts',
  },
});
```

### 4. Create your production server entry file

```ts
// app/.server/prod-server.ts

import * as build from 'virtual:remix/server-build';
import express from 'express';
import startApp from './app';
import { getLoadContext } from './get-load-context';

startApp({
  build: build,
  getLoadContext: getLoadContext,
  registerAssetMiddleware: (app) => {
    app.use(
      '/assets',
      express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
    );
  },
});
```

### 5. Install vite plugin

```ts
// vite.config.ts

import { vitePlugin as remix } from '@remix-run/dev';
import { remixExpressAppPlugin } from '@bad-hacking/remix-express-app/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    remix(),
    remixExpressAppPlugin({
      productionServerEntry: 'app/.server/prod-server.ts',
    }),
  ],
});
```
