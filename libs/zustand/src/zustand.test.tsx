import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  type GameState,
  type PlayerKey,
  type Position,
  lineChecks,
} from './test/fixture/TicTacToe';
import {
  type ActionDefinitions,
  type EnhancedStore,
  createStore,
} from './zustand';

describe('createStore()', () => {
  type State = {
    count: number;
    nextPlayer: PlayerKey;
    ticTacToe: GameState;
  };

  type Actions = typeof actions;

  const actions = {
    increment: (store) =>
      store.update((draft) => {
        draft.count += 1;
      }),

    markPosition: (store, x: number, y: number) => {
      store.update((draft) => {
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

  const storeUtils = createStore<State, Actions>(actions);
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

  let testStore: EnhancedStore<State>;

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
      testStore.update((draft) => {
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
