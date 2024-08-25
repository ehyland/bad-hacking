import { type WritableDraft, produce } from 'immer';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { create } from 'zustand';

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

type CreateStoreResult<TState, TActions extends ActionDefinitions> = {
  StoreProvider: (props: {
    initialState: TState;
    children: ReactNode;
  }) => ReactNode;

  useStore: () => EnhancedStore<TState>;
  useSelector: <TResult>(selector: Selector<TState, TResult>) => TResult;
  useActions: () => BoundActions<TActions>;
};

type Selector<TState, TResult> = (state: TState) => TResult;

export function createStore<TState, TActions extends ActionDefinitions>(
  actions: TActions,
): CreateStoreResult<TState, TActions> {
  type ContextValue = {
    store: EnhancedStore<TState>;
    actions: BoundActions<TActions>;
  };

  const StoreContext = createContext<ContextValue | undefined>(undefined);

  const StoreProvider = (props: {
    initialState: TState;
    children: ReactNode;
  }) => {
    const [store] = useState<EnhancedStore<TState>>(() => {
      const base = create<TState>(() => props.initialState);
      return Object.assign(base, { update: (update<TState>).bind(null, base) });
    });

    const contextValue = useMemo(() => {
      const boundActions = bindActions(store, actions);
      return { store, actions: boundActions };
    }, [store, actions]);

    return <StoreContext.Provider {...props} value={contextValue} />;
  };

  const useStoreContext = () => {
    const store = useContext(StoreContext);

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

type Action<TState, TArgs extends any[], TResult> = (
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
