export type PlayerKey = 'x' | 'o';
export type Position = { x: number; y: number };
export type PositionState = PlayerKey | undefined;

export type Matrix<T> = Array<Array<T>>;
export type GameState = [
  [PositionState, PositionState, PositionState],
  [PositionState, PositionState, PositionState],
  [PositionState, PositionState, PositionState],
];

function* walkHorizontal<T>(table: Matrix<T>, rowIndex: number) {
  for (const item of table[rowIndex]) {
    yield item;
  }
  return undefined;
}

function* walkVertical<T>(table: Matrix<T>, columnIndex: number) {
  for (const row of table) {
    yield row[columnIndex];
  }
  return undefined;
}

function* walkCross<T>(table: Matrix<T>, start: 'top_left' | 'bottom_left') {
  if (start === 'top_left') {
    for (let index = 0; index < table.length; index++) {
      yield table[index][index];
    }
  } else {
    for (let index = 0; index < table.length; index++) {
      yield table[table.length - 1 - index][index];
    }
  }

  return undefined;
}

export const lineChecks = [
  (game: GameState) => checkLine(walkVertical(game, 0)),
  (game: GameState) => checkLine(walkVertical(game, 1)),
  (game: GameState) => checkLine(walkVertical(game, 2)),
  (game: GameState) => checkLine(walkHorizontal(game, 0)),
  (game: GameState) => checkLine(walkHorizontal(game, 1)),
  (game: GameState) => checkLine(walkHorizontal(game, 2)),
  (game: GameState) => checkLine(walkCross(game, 'top_left')),
  (game: GameState) => checkLine(walkCross(game, 'bottom_left')),
];

function checkLine(
  line: Generator<PositionState, void>,
): false | { marker: PlayerKey } {
  const first = line.next();
  const firstValue = first.value;

  if (!firstValue) {
    return false;
  }

  for (const value of line) {
    if (value !== firstValue) return false;
  }

  return { marker: firstValue };
}
