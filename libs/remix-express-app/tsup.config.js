import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'create-app': './src/create-app.ts',
    'vite-plugin': './src/vite-plugin.ts',
    'dev-server': './src/dev-server.ts',
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  format: 'esm',
  treeshake: true,
  skipNodeModulesBundle: true,
});
