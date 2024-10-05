import { type WritableDraft, produce } from 'immer';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { create } from 'zustand';
import { createBetterContext } from './context';

export type EnhancedStore<TState> = UseBoundStore<StoreApi<TState>> & {
  update: (updater: (draft: WritableDraft<TState>) => void) => void;
};

export function update<TState>(
  store: UseBoundStore<StoreApi<TState>>,
  updater: (draft: WritableDraft<TState>) => void,
) {
  const nextState = produce(store.getState(), updater);
  store.setState(nextState);
}

type CreateReactHooksResult<TState, TActions extends ActionDefinitions> = {
  StoreProvider: (props: StoreProviderProps<TState>) => ReactNode;
  useStore: () => EnhancedStore<TState>;
  useSelector: <TResult>(selector: Selector<TState, TResult>) => TResult;
  useActions: () => BoundActions<TActions>;
};

type Selector<TState, TResult> = (state: TState) => TResult;

export function createStore<TState>(
  initialState: TState,
): EnhancedStore<TState> {
  const baseStore = create<TState>(() => initialState);
  return enhanceStore(baseStore);
}

export function enhanceStore<TState>(
  store: UseBoundStore<StoreApi<TState>>,
): EnhancedStore<TState> {
  return Object.assign(store, {
    update: (update<TState>).bind(null, store),
  });
}

type StoreProviderProps<TState> =
  | {
      initialState: TState;
      store?: undefined;
      children: ReactNode;
    }
  | {
      initialState?: undefined;
      store: EnhancedStore<TState>;
      children: ReactNode;
    };

export function createReactHooks<TState, TActions extends ActionDefinitions>(
  actions: TActions | (() => TActions),
): CreateReactHooksResult<TState, TActions> {
  type ContextValue = {
    store: EnhancedStore<TState>;
    actions: BoundActions<TActions>;
  };

  const getActions = typeof actions === 'function' ? actions : () => actions;

  const BaseProvider = createBetterContext<ContextValue>('zustand-store');

  const StoreProvider = (props: StoreProviderProps<TState>) => {
    const [store] = useState<EnhancedStore<TState>>(
      () => props.store ?? createStore(props.initialState),
    );

    const contextValue = useMemo(() => {
      const boundActions = bindActions(store, getActions());
      return { store, actions: boundActions };
    }, [store]);

    return <BaseProvider {...props} value={contextValue} />;
  };

  const useStoreContext = () => {
    const store = BaseProvider.use();

    if (!store) throw Error("Can't find store in tree");

    return store;
  };

  const useStore = () => {
    return useStoreContext().store;
  };

  function useSelector<TResult>(selector: Selector<TState, TResult>): TResult {
    return useStoreContext().store(selector);
  }

  const useActions = () => {
    return useStoreContext().actions;
  };

  return {
    StoreProvider,
    useStore,
    useSelector,
    useActions,
  };
}

export type Action<TState, TArgs extends any[], TResult> = (
  store: EnhancedStore<TState>,
  ...args: TArgs
) => TResult;

export type ActionDefinitions<TState = any> = {
  [name: string]: Action<TState, any[], any>;
};

type BoundAction<T> =
  T extends Action<any, infer TArgs, infer TResult>
    ? (...args: TArgs) => TResult
    : never;

export type BoundActions<T> = {
  [Property in keyof T]: BoundAction<T[Property]>;
};

function bindActions<TActions extends ActionDefinitions, TState>(
  store: EnhancedStore<TState>,
  actions: TActions,
): BoundActions<TActions> {
  return Object.fromEntries(
    Object.entries(actions).map(
      ([key, action]) => [key, action.bind(null, store)] as const,
    ),
  ) as BoundActions<TActions>;
}
