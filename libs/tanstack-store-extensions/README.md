# TanStack Store Extensions

## Features

- React hooks
  - `<StoreProvider />` to create and share store instances through react context
  - `useActions()` access action function bound to the store in react context
  - `useSelector()` use selectors to access state from store in react context
  - `useStore()` access the underlying store api from react components
- Immer state updater
  - to make updating nested state easier
- Async Resources
  - auto generate loader actions & selectors for async state
  - coming soon: allow parameters to be passed to loaders

## Example

```tsx
import {
  type ActionDefinitions,
  type ImmerStore,
  createReactHooks,
  createStore,
} from '@bad-hacking/tanstack-store-extensions';

const resources = defineResources({
  prise: { loader: async () => 100_000 },
  flashMessages: { loader: async () => ['10% off today only!'] },
  maintenanceMode: { loader: async () => false },
});

type State = {
  resources: InferStateSlice<typeof resources>;
  count: number;
  nextPlayer: PlayerKey;
  ticTacToe: GameState;
};

type Actions = typeof actions;

const actions = {
  loadResource: resources.actions.load,
  increment: (store) =>
    store.setState((draft) => {
      draft.count += 1;
    }),

  markPosition: (store, x: number, y: number) => {
    store.setState((draft) => {
      draft.ticTacToe[y][x] = draft.nextPlayer;
      draft.nextPlayer = draft.nextPlayer === 'x' ? 'o' : 'x';
    });
  },
} satisfies ActionDefinitions<State>;

const initialState = {
  resources: resources.initialStateSlice,
  count: 0,
  nextPlayer: 'x',
  ticTacToe: [
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
  ],
};

const { StoreProvider, useActions, useSelector, useStore } = createReactHooks<
  State,
  Actions
>(actions);

export const App = () => {
  return (
    <StoreProvider initialState={initialState}>
      <TicTacToe />
    </StoreProvider>
  );
};

const TicTacToe = () => {
  const actions = useActions();
  const winner = useSelector(selectors.getWinner);
  const prise = useSelector(resources.selectors.prise.state);

  return (
    <>
      <button onClick={actions.load('prise')}></button>
      <div>{prise.status === 'LOADED' && `Winning prise is ${prise.data}`}</div>
    </>
  );
};
```
