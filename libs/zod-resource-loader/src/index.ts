import { z } from 'zod';

const baseResourceStateSchema = z.union([
  z.object({ status: z.literal('INITIAL') }),
  z.object({ status: z.literal('LOADING'), timestamp: z.number() }),
  z.object({
    status: z.literal('ERROR'),
    timestamp: z.number(),
    errorMessage: z.string(),
  }),
]);

const baseLoadedSchema = z.object({
  status: z.literal('LOADED'),
  timestamp: z.number(),
  dataTimestamp: z.number(),
  isRefreshing: z.boolean(),
  refreshError: z.string().optional(),
});

export type ResourceState<T> =
  | z.infer<typeof baseResourceStateSchema>
  | (z.infer<typeof baseLoadedSchema> & { data: T });

export function createResourceStateSchema<TData>(
  dataSchema: z.ZodSchema<TData>,
): z.ZodSchema<ResourceState<TData>> {
  return baseResourceStateSchema.or(
    baseLoadedSchema.extend({
      data: dataSchema,
    }),
  ) as unknown as z.ZodSchema<ResourceState<TData>>;
}

type ResourceConfig<TData> = {
  schema: z.ZodSchema<ResourceState<TData>>;
  loader: () => Promise<TData>;
};

type StoreConfig<TData> = {
  getState: () => ResourceState<TData>;
  updateState: (state: ResourceState<TData>) => void;
};

type LoadOptions = {
  refresh: boolean;
};

type Outcome = {
  outcome: 'success' | 'skipped' | 'error';
};

export async function load<TData>(
  resource: ResourceConfig<TData>,
  store: StoreConfig<TData>,
  { refresh = false }: Partial<LoadOptions> = {},
): Promise<Outcome> {
  const initial = store.getState();

  if (initial.status === 'LOADED') {
    initial.isRefreshing;
  }

  if (
    // exit if loading
    initial.status === 'LOADING' ||
    // exit if loaded and is refreshing or refresh flag is not true
    (initial.status === 'LOADED' && (initial.isRefreshing || !refresh))
  ) {
    return { outcome: 'skipped' };
  }

  if (initial.status === 'LOADED') {
    store.updateState({
      status: 'LOADED',
      timestamp: Date.now(),
      data: initial.data as any,
      dataTimestamp: initial.dataTimestamp,
      isRefreshing: true,
      refreshError: undefined,
    });
  } else {
    store.updateState({
      status: 'LOADING',
      timestamp: Date.now(),
    });
  }
  return await resource.loader().then(
    (data) => {
      store.updateState({
        status: 'LOADED',
        timestamp: Date.now(),
        data: data,
        dataTimestamp: Date.now(),
        isRefreshing: false,
        refreshError: undefined,
      });
      return { outcome: 'success' };
    },
    (error) => {
      const beforeError = store.getState();
      if (beforeError.status === 'LOADED') {
        store.updateState({
          status: 'LOADED',
          timestamp: Date.now(),
          dataTimestamp: beforeError.dataTimestamp,
          data: beforeError.data,
          isRefreshing: false,
          refreshError: error?.message || 'An error occurred',
        });
      } else {
        store.updateState({
          status: 'ERROR',
          timestamp: Date.now(),
          errorMessage: error?.message || 'An error occurred',
        });
      }
      return { outcome: 'error' };
    },
  );
}
