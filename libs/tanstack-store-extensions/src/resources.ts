import type { ImmerStore } from './create-store';

type ResourceDefinition<TData> = {
  loader: () => Promise<TData>;
};

type ResourceDefinitions = {
  [Key: string]: ResourceDefinition<any>;
};

type ResourceState<TData> =
  | { status: 'INITIAL' }
  | { status: 'LOADING'; timestamp: number }
  | {
      status: 'LOADED';
      isRefreshing: boolean;
      data: TData;
      refreshError: undefined | string;
      timestamp: number;
      dataTimestamp: number;
    }
  | { status: 'ERROR'; timestamp: number; errorMessage: string };

type Resources<T extends ResourceDefinitions> = {
  initialStateSlice: DefinitionsToInitialStateSlice<T>;
  actions: DefinitionsToActions<T>;
  selectors: DefinitionsToSelectors<T>;
};

/* utils */

type InferDataType<T> = T extends ResourceDefinition<infer D> ? D : never;

export type InferStateSlice<T> =
  T extends Resources<infer D> ? DefinitionsToInitialStateSlice<D> : never;

type DefinitionToState<T> =
  T extends ResourceDefinition<infer D> ? ResourceState<D> : never;

type DefinitionsToInitialStateSlice<T extends ResourceDefinitions> = {
  resources: {
    [Key in keyof T]: DefinitionToState<T[Key]>;
  };
};

type DefinitionsToActions<T extends ResourceDefinitions> = {
  load(
    store: ImmerStore<LooseState>,
    key: keyof T,
    refresh?: boolean,
  ): Promise<void>;
};

type DefinitionsToSelectors<T extends ResourceDefinitions> = {
  [Key in keyof T]: DefinitionToSelectors<T[Key]>;
};

type DefinitionToSelectors<T extends ResourceDefinition<any>> = {
  state: (state: LooseState) => ResourceState<InferDataType<T>>;
};

type LooseState = {
  resources: any;
};

/* implementation */

export function defineResources<T extends ResourceDefinitions>(
  resourceDefinitions: T,
): Resources<T> {
  return {
    initialStateSlice: definitionsToInitialState(resourceDefinitions),
    actions: definitionsToActions(resourceDefinitions),
    selectors: definitionsToSelectors(resourceDefinitions),
  };
}

function definitionsToInitialState<T extends ResourceDefinitions>(
  resourceDefinitions: T,
): DefinitionsToInitialStateSlice<T> {
  return {
    resources: Object.fromEntries(
      Object.keys(resourceDefinitions).map((key) => [
        key,
        { status: 'INITIAL' },
      ]),
    ),
  } as DefinitionsToInitialStateSlice<T>;
}

function definitionsToSelectors<T extends ResourceDefinitions>(
  resourceDefinitions: T,
): DefinitionsToSelectors<T> {
  return Object.fromEntries(
    Object.keys(resourceDefinitions).map((key) => [
      key,
      {
        state: baseStateSelector.bind(null, key),
      } as DefinitionToSelectors<any>,
    ]),
  ) as DefinitionsToSelectors<T>;
}

function baseStateSelector<T extends ResourceDefinition<any>>(
  key: string,
  state: LooseState,
): ResourceState<InferDataType<T>> {
  return state.resources[key];
}

function definitionsToActions<T extends ResourceDefinitions>(
  resourceDefinitions: T,
): DefinitionsToActions<T> {
  return {
    load: (baseLoadAction<T, keyof T & string>).bind(
      null,
      resourceDefinitions,
      new Set(Object.keys(resourceDefinitions)),
    ),
  };
}

async function baseLoadAction<
  T extends ResourceDefinitions,
  Key extends keyof T & string,
>(
  resourceDefinitions: T,
  validKeys: Set<Key>,
  store: ImmerStore<LooseState>,
  key: Key,
  refreshFlag = false,
) {
  if (!validKeys.has(key)) {
    throw new Error(`Invalid key "${key as string}"`);
  }

  const resource = resourceDefinitions[key];

  const updateResource = (state: ResourceState<any>) => {
    store.setState((d) => {
      d.resources[key] = state;
    });
  };

  const initial = store.state.resources[key] as ResourceState<any>;

  if (
    // exit if loading
    initial.status === 'LOADING' ||
    // exit if loaded and is refreshing or refresh flag is not true
    (initial.status === 'LOADED' && (initial.isRefreshing || !refreshFlag))
  ) {
    return;
  }

  if (initial.status === 'LOADED') {
    updateResource({
      status: 'LOADED',
      timestamp: Date.now(),
      data: initial.data,
      dataTimestamp: initial.dataTimestamp,
      isRefreshing: true,
      refreshError: undefined,
    });
  } else {
    updateResource({
      status: 'LOADING',
      timestamp: Date.now(),
    });
  }

  await resource.loader().then(
    (data) => {
      updateResource({
        status: 'LOADED',
        timestamp: Date.now(),
        data: data,
        dataTimestamp: Date.now(),
        isRefreshing: false,
        refreshError: undefined,
      });
    },
    (error) => {
      const beforeError = store.state.resources[key] as ResourceState<any>;

      if (beforeError.status === 'LOADED') {
        updateResource({
          status: 'LOADED',
          timestamp: Date.now(),
          dataTimestamp: beforeError.dataTimestamp,
          data: beforeError.data,
          isRefreshing: false,
          refreshError: error?.message || 'An error occurred',
        });
      } else {
        updateResource({
          status: 'ERROR',
          timestamp: Date.now(),
          errorMessage: error?.message || 'An error occurred',
        });
      }
    },
  );
}

/* examples */

// declare function defineResources<T extends ResourceDefinitions>(
//   definitions: T,
// ): Resources<T>;

// const resources = defineResources({
//   prise: { loader: async () => 100_000 },
//   flashMessages: { loader: async () => ['10% off today only'] },
//   maintenanceMode: { loader: async () => false },
// });

// resources.selectors.flashMessages.state({ resources: {} });
