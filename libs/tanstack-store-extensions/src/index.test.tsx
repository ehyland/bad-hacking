import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import {
  type ActionDefinitions,
  type ImmerStore,
  createReactHooks,
  createStore,
} from './index';
import {
  type GameState,
  type PlayerKey,
  type Position,
  lineChecks,
} from './test/fixtures/tic-tac-toe';

describe('createReactHooks()', () => {
  type State = {
    count: number;
    nextPlayer: PlayerKey;
    ticTacToe: GameState;
  };

  type Actions = typeof actions;

  const actions = {
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

  const selectWinner = (state: State) => {
    for (const check of lineChecks) {
      const result = check(state.ticTacToe);
      if (result !== false) {
        return result;
      }
    }

    return false;
  };

  const storeUtils = createReactHooks<State, Actions>(actions);
  const { StoreProvider, useActions, useSelector, useStore } = storeUtils;

  const TestComponent = () => {
    return (
      <StoreProvider
        initialState={{
          count: 0,
          nextPlayer: 'x',
          ticTacToe: [
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
          ],
        }}
      >
        <TestConsumer />
      </StoreProvider>
    );
  };

  let testStore: ImmerStore<State>;

  const positionToLabel = (args: { x: number; y: number }) =>
    `${args.x},${args.y}`;
  const TestConsumer = () => {
    const count = useSelector((state) => state.count);
    const ticTacToe = useSelector((state) => state.ticTacToe);
    const winner = useSelector(selectWinner);
    const actions = useActions();
    testStore = useStore();
    return (
      <div>
        <input aria-label="count" type="text" value={count} readOnly />
        <button type="button" onClick={() => actions.increment()}>
          increment
        </button>
        <div>
          {winner && <div data-testid="winner">{winner.marker}</div>}
          {ticTacToe.map((row, y) =>
            row.map((status, x) => (
              <button
                key={positionToLabel({ x, y })}
                aria-label={positionToLabel({ x, y })}
                type="button"
                onClick={() => actions.markPosition(x, y)}
              >
                {status}
              </button>
            )),
          )}
        </div>
      </div>
    );
  };

  it('creates utilities', () => {
    expect(storeUtils).toEqual({
      StoreProvider: expect.any(Function),
      useStore: expect.any(Function),
      useSelector: expect.any(Function),
      useActions: expect.any(Function),
    });
  });

  it('supports a basic increment app', async () => {
    render(<TestComponent />);
    const user = userEvent.setup();
    expect(screen.getByLabelText('count')).toHaveValue('0');
    await user.click(screen.getByRole('button', { name: 'increment' }));
    expect(screen.getByLabelText('count')).toHaveValue('1');
    await user.click(screen.getByRole('button', { name: 'increment' }));
    await user.click(screen.getByRole('button', { name: 'increment' }));
    expect(screen.getByLabelText('count')).toHaveValue('3');

    // it listens to store updates
    act(() => {
      testStore.setState((draft) => {
        draft.count = 10;
      });
    });
    expect(screen.getByLabelText('count')).toHaveValue('10');
  });

  it('supports ticTacToe app', async () => {
    render(<TestComponent />);
    const user = userEvent.setup();

    async function clickAndExpectUpdate(
      position: Position,
      expectations: { marker: PlayerKey; winner?: boolean },
    ) {
      await user.click(screen.getByLabelText(positionToLabel(position)));
      expect(
        screen.getByLabelText(positionToLabel(position)),
      ).toHaveTextContent(expectations.marker);

      if (expectations.winner) {
        expect(screen.getByTestId('winner')).toHaveTextContent(
          expectations.marker,
        );
      } else {
        expect(screen.queryByTestId('winner')).not.toBeInTheDocument();
      }
    }

    await clickAndExpectUpdate({ x: 0, y: 0 }, { marker: 'x' });
    await clickAndExpectUpdate({ x: 1, y: 1 }, { marker: 'o' });
    await clickAndExpectUpdate({ x: 2, y: 2 }, { marker: 'x' });
    await clickAndExpectUpdate({ x: 2, y: 1 }, { marker: 'o' });
    await clickAndExpectUpdate({ x: 1, y: 0 }, { marker: 'x' });
    await clickAndExpectUpdate({ x: 0, y: 1 }, { marker: 'o', winner: true });
  });
});

describe('createStore()', () => {
  type State = {
    count: number;
  };

  type Store = ImmerStore<State>;

  const actions = {
    increment: (store: Store, increment = 1) => {
      store.setState((d) => {
        d.count += increment;
      });
    },
  };

  const selectors = {
    count: (state: State) => state.count,
  };

  let store: ImmerStore<State>;

  beforeEach(() => {
    store = createStore<State>({ initialState: { count: 0 } });
  });

  it('create a standard store', () => {
    expect(store.state).toEqual({ count: 0 });
    actions.increment(store);
    expect(store.state).toEqual({ count: 1 });
    actions.increment(store, 4);
    expect(store.state).toEqual({ count: 5 });
  });

  it('enhances store with immer', () => {
    store.setState((d) => {
      d.count = 6;
    });

    const count = selectors.count(store.state);
    expect(count).toEqual(6);
    expectTypeOf(count).toBeNumber();
  });
});
