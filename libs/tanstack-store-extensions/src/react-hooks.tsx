import { useStore as useTanStackStore } from '@tanstack/react-store';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { createBetterContext } from './context';
import { type ImmerStore, createStore } from './create-store';

type CreateReactHooksResult<TState, TActions extends ActionDefinitions> = {
  StoreProvider: (props: StoreProviderProps<TState>) => ReactNode;
  useStore: () => ImmerStore<TState>;
  useSelector: <TResult>(selector: Selector<TState, TResult>) => TResult;
  useActions: () => BoundActions<TActions>;
};

type Selector<TState, TResult> = (state: TState) => TResult;

type StoreProviderProps<TState> =
  | {
      initialState: TState;
      store?: undefined;
      children: ReactNode;
    }
  | {
      initialState?: undefined;
      store: ImmerStore<TState>;
      children: ReactNode;
    };

export function createReactHooks<TState, TActions extends ActionDefinitions>(
  actions: TActions | (() => TActions),
): CreateReactHooksResult<TState, TActions> {
  type ContextValue = {
    store: ImmerStore<TState>;
    actions: BoundActions<TActions>;
  };

  const getActions = typeof actions === 'function' ? actions : () => actions;

  const BaseProvider = createBetterContext<ContextValue>('store');

  const StoreProvider = (props: StoreProviderProps<TState>) => {
    const [store] = useState<ImmerStore<TState>>(
      () => props.store ?? createStore({ initialState: props.initialState }),
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

  const useActions = () => {
    return useStoreContext().actions;
  };

  function useSelector<TResult>(selector: Selector<TState, TResult>): TResult {
    return useTanStackStore(useStore(), selector);
  }

  return {
    StoreProvider,
    useStore,
    useSelector,
    useActions,
  };
}

export type Action<TState, TArgs extends any[], TResult> = (
  store: ImmerStore<TState>,
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
  store: ImmerStore<TState>,
  actions: TActions,
): BoundActions<TActions> {
  return Object.fromEntries(
    Object.entries(actions).map(
      ([key, action]) => [key, action.bind(null, store)] as const,
    ),
  ) as BoundActions<TActions>;
}
