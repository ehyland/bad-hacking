import { expect, it } from 'vitest';
import { z } from 'zod';
import { type ResourceState, createResourceStateSchema, load } from './index';

const dataSchema = z.object({
  baseCurrency: z.string(),
  rates: z.object({
    AUD: z.number(),
    NZD: z.number(),
  }),
});

const stateSchema = createResourceStateSchema(dataSchema);

type DataType = z.infer<typeof dataSchema>;

vi.useFakeTimers({
  now: new Date('2024-10-31T10:00:00.000Z'),
});

describe('schema', () => {
  it('passes valid initial state', () => {
    const state: z.infer<typeof stateSchema> = {
      status: 'INITIAL',
    };
    expect(stateSchema.parse(state)).toEqual(state);
  });

  it('passes valid loading state', () => {
    const state: z.infer<typeof stateSchema> = {
      status: 'LOADING',
      timestamp: Date.now(),
    };
    expect(stateSchema.parse(state)).toEqual(state);
  });

  it('passes valid loaded state', () => {
    const state: z.infer<typeof stateSchema> = {
      status: 'LOADED',
      timestamp: Date.now(),
      dataTimestamp: Date.now(),
      isRefreshing: false,
      refreshError: undefined,
      data: { baseCurrency: 'USD', rates: { AUD: 1.5, NZD: 1.8 } },
    };
    expect(stateSchema.parse(state)).toEqual(state);
  });

  it('passes valid refresh state', () => {
    const state: z.infer<typeof stateSchema> = {
      status: 'LOADED',
      timestamp: Date.now(),
      dataTimestamp: Date.now(),
      isRefreshing: true,
      refreshError: undefined,
      data: { baseCurrency: 'USD', rates: { AUD: 1.5, NZD: 1.8 } },
    };
    expect(stateSchema.parse(state)).toEqual(state);
  });

  it('passes valid refresh error state', () => {
    const state: z.infer<typeof stateSchema> = {
      status: 'LOADED',
      timestamp: Date.now(),
      dataTimestamp: Date.now(),
      isRefreshing: false,
      refreshError: '503',
      data: { baseCurrency: 'USD', rates: { AUD: 1.5, NZD: 1.8 } },
    };
    expect(stateSchema.parse(state)).toEqual(state);
  });

  it('fails invalid data state', () => {
    const state = {
      status: 'LOADED',
      timestamp: 100,
      dataTimestamp: 200,
      isRefreshing: false,
      refreshError: '503',
      data: { baseCurrency: 'USD', rates: { NZD: 1.8 } },
    };

    expect(() => stateSchema.parse(state)).toThrowError();
  });

  it('strips additional fields based on status', () => {
    const state = {
      status: 'INITIAL',
      timestamp: Date.now(),
      dataTimestamp: Date.now(),
      isRefreshing: false,
      refreshError: '503',
      data: { baseCurrency: 'USD', rates: { AUD: 1.5, NZD: 1.8 } },
    };

    expect(stateSchema.parse(state)).toEqual({ status: 'INITIAL' });
  });
});

describe('loader', () => {
  it('handles initial to loaded', async () => {
    let state: ResourceState<DataType> = { status: 'INITIAL' };

    const loader = vi.fn(async (): Promise<DataType> => {
      return { baseCurrency: 'USD', rates: { AUD: 1.5, NZD: 1.8 } };
    });

    const stateState = vi.fn((_state: ResourceState<DataType>): void => {
      state = _state;
    });

    const outcome = await load(
      { schema: stateSchema, loader: loader },
      { getState: () => state, updateState: stateState },
    );

    expect(outcome).toEqual({ outcome: 'success' });

    expect(stateState).toHaveBeenCalledWith({
      status: 'LOADING',
      timestamp: 1730368800000,
    });

    expect(state).toEqual({
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.5,
          NZD: 1.8,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: false,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    });
  });

  it('handles loaded to refreshed', async () => {
    let state: ResourceState<DataType> = {
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.5,
          NZD: 1.8,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: false,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    };

    const loader = vi.fn(async (): Promise<DataType> => {
      return { baseCurrency: 'USD', rates: { AUD: 1.4, NZD: 1.6 } };
    });

    const stateState = vi.fn((_state: ResourceState<DataType>): void => {
      state = _state;
    });

    const outcome = await load(
      { schema: stateSchema, loader: loader },
      { getState: () => state, updateState: stateState },
      { refresh: true },
    );

    expect(outcome).toEqual({ outcome: 'success' });

    expect(stateState).toHaveBeenCalledWith({
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.5,
          NZD: 1.8,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: true,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    });

    expect(state).toEqual({
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.4,
          NZD: 1.6,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: false,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    });
  });

  it('handles loaded to refreshed skipped', async () => {
    const initialState: ResourceState<DataType> = {
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.5,
          NZD: 1.8,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: false,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    };

    let state: ResourceState<DataType> = initialState;

    const loader = vi.fn(async (): Promise<DataType> => {
      return { baseCurrency: 'USD', rates: { AUD: 1.4, NZD: 1.6 } };
    });

    const stateState = vi.fn((_state: ResourceState<DataType>): void => {
      state = _state;
    });

    const outcome = await load(
      { schema: stateSchema, loader: loader },
      { getState: () => state, updateState: stateState },
    );

    expect(outcome).toEqual({ outcome: 'skipped' });

    expect(stateState).not.toHaveBeenCalled();

    expect(state).toEqual(initialState);
  });

  it('handles loaded to refreshed error', async () => {
    const initialState: ResourceState<DataType> = {
      data: {
        baseCurrency: 'USD',
        rates: {
          AUD: 1.5,
          NZD: 1.8,
        },
      },
      dataTimestamp: 1730368800000,
      isRefreshing: false,
      refreshError: undefined,
      status: 'LOADED',
      timestamp: 1730368800000,
    };

    let state: ResourceState<DataType> = initialState;

    const loader = vi.fn(async (): Promise<DataType> => {
      throw new Error('Fuuuuuck!');
    });

    const stateState = vi.fn((_state: ResourceState<DataType>): void => {
      state = _state;
    });

    const outcome = await load(
      { schema: stateSchema, loader: loader },
      { getState: () => state, updateState: stateState },
      { refresh: true },
    );

    expect(outcome).toEqual({ outcome: 'error' });

    expect(stateState).toHaveBeenCalledWith({
      ...initialState,
      isRefreshing: true,
    });

    expect(state).toEqual({
      ...initialState,
      refreshError: 'Fuuuuuck!',
    });
  });
});
