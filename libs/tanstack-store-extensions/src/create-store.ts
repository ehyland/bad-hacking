import { Store } from '@tanstack/store';
import type { WritableDraft } from 'immer';
import { produce } from 'immer';

export type ImmerUpdater<TState> = (state: WritableDraft<TState>) => undefined;
export type ImmerStore<TState> = Store<TState, ImmerUpdater<TState>>;

export function createStore<TState>(args: {
  initialState: TState;
}): ImmerStore<TState> {
  return new Store<TState, ImmerUpdater<TState>>(args.initialState, {
    updateFn: (prev) => (updater) => {
      return produce(prev, updater);
    },
  });
}
