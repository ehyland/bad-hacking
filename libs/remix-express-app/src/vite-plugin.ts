import type { PluginOption } from 'vite';

export function remixExpressAppPlugin(args: {
  productionServerEntry: string;
}): PluginOption {
  return {
    name: 'remix-express-app-plugin',
    apply(_config, env): boolean {
      return env.command === 'build' && env?.isSsrBuild === true;
    },
    config: async () => {
      return {
        build: {
          ssr: args.productionServerEntry,
        },
      };
    },
  };
}
