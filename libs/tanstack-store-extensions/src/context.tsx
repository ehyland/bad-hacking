import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

type ProviderProps<TValue> = { value: TValue; children: ReactNode };

interface BetterContext<TValue> {
  (props: ProviderProps<TValue>): ReactNode;
  use: () => TValue;
}

export function createBetterContext<TValue>(
  name: string,
): BetterContext<TValue> {
  const Context = createContext<TValue | undefined>(undefined);
  const Provider = (props: ProviderProps<TValue>) => (
    <Context.Provider value={props.value}>{props.children}</Context.Provider>
  );
  const use = () => {
    const maybeValue = useContext(Context);
    if (maybeValue === undefined)
      throw new Error(`Context not found [name=${name}]`);
    return maybeValue;
  };

  return Object.assign(Provider, { use });
}
