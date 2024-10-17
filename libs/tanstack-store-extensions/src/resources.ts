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
  | { status: 'ERROR'; timestamp: number };

type Resources<T extends ResourceDefinitions> = {
  initialStateSlice: DefinitionsToInitialState<T>;
  actions: DefinitionsToActions<T>;
  selectors: DefinitionsToSelectors<T>;
};

/* utils */

type InferDataType<T> = T extends ResourceDefinition<infer D> ? D : never;
type DefinitionToState<T> =
  T extends ResourceDefinition<infer D> ? ResourceState<D> : never;

type DefinitionsToInitialState<T extends ResourceDefinitions> = {
  [Key in keyof T]: DefinitionToState<T[Key]>;
};

type ResourceActions = {
  load(refresh?: boolean): Promise<undefined>;
};

type DefinitionsToActions<T extends ResourceDefinitions> = {
  load(key: keyof T, refresh?: boolean): Promise<undefined>;
};

type DefinitionsToSelectors<T extends ResourceDefinitions> = {
  [Key in keyof T]: DefinitionToSelectors<T[Key]>;
};

type DefinitionToSelectors<T extends ResourceDefinition<any>> = {
  state: (state: LooseState) => InferDataType<T>;
};

type LooseState = {
  resources: { [key: string]: ResourceState<any> };
};

/* examples */

declare function defineResources<T extends ResourceDefinitions>(
  definitions: T,
): Resources<T>;

const resources = defineResources({
  prise: { loader: async () => 100_000 },
  flashMessages: { loader: async () => ['10% off today only'] },
  maintenanceMode: { loader: async () => false },
});

resources.selectors.flashMessages.state({ resources: {} });
