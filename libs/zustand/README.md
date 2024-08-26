# Zustand Tools

Helper library that makes working with zustand easier

✨ Separate actions from state

✨ Automatically create bound react hooks & providers

✨ Immer integration with `store.update(fn)`

✨ Better TypeScript experience

## Examples

### Example: TicTacToe Game

```tsx
import { createReactHooks, type ActionDefinitions } from '@bad-hacking/zustand';

type PlayerKey = 'x' | 'o';

type PositionState = PlayerKey | undefined;

type BoardState = [
  [PositionState, PositionState, PositionState],
  [PositionState, PositionState, PositionState],
  [PositionState, PositionState, PositionState],
];

type State = {
  nextPlayer: PlayerKey;
  board: BoardState;
};

type Actions = typeof actions;

const actions = {
  markPosition: (store, x: number, y: number) => {
    store.update((draft) => {
      draft.board[y][x] = draft.nextPlayer;
      draft.nextPlayer = draft.nextPlayer === 'x' ? 'o' : 'x';
    });
  },
} satisfies ActionDefinitions<State>;

const selectWinner = (state: State) => {
  /* find a winning line */
};

const { StoreProvider, useActions, useSelector, useStore } = createReactHooks<
  State,
  Actions
>(actions);

export const App = () => {
  return (
    <StoreProvider
      initialState={{
        nextPlayer: 'x',
        board: [
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
      }}
    >
      <TicTacToe />
    </StoreProvider>
  );
};

export const TicTacToe = () => {
  const actions = useActions();
  const winner = useSelector(selectWinner);
  const board = useSelector((state) => state.board);
  return (
    <div>
      {winner && <div>And the winner is {winner.marker}</div>}
      {board.map((row, y) =>
        row.map((status, x) => (
          <button
            key={`${x},${y}`}
            type="button"
            onClick={() => actions.markPosition(x, y)}
          >
            {status}
          </button>
        )),
      )}
    </div>
  );
};
```
