import { type ImmerStore, createStore } from './create-store';
import { type InferStateSlice, defineResources } from './resources';

type MockPromise<T> = Promise<T> & {
  mock: {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
  };
};

vi.useFakeTimers({
  now: new Date('2024-10-18T08:00:00.000Z'),
});

describe('resources', () => {
  let promises: MockPromise<any>[];

  const createTestPromise = <T>() => {
    const mock = {
      resolve: (value: T | PromiseLike<T>) => {},
      reject: (reason?: any) => {},
    };
    const promise = new Promise<T>((resolve, reject) => {
      mock.resolve = resolve;
      mock.reject = reject;
    });

    const testPromise = Object.assign(promise, { mock });

    promises.push(testPromise);

    return testPromise;
  };

  const resources = defineResources({
    prise: {
      loader: async () => 100_000,
    },
    flashMessages: {
      loader: async () => ['Save 10% today only'],
    },
    maintenanceMode: {
      loader: async () => false,
    },
  });

  type State = {
    resources: InferStateSlice<typeof resources>;
  };

  let store: ImmerStore<State>;

  beforeEach(() => {
    promises = [];
    store = createStore<State>({
      initialState: { resources: resources.initialStateSlice },
    });
  });

  it('creates store with initial state', () => {
    const initialResourceState = { status: 'INITIAL' };
    expect(store.state).toEqual({
      resources: {
        flashMessages: initialResourceState,
        maintenanceMode: initialResourceState,
        prise: initialResourceState,
      },
    });
  });

  it('sets loading state while', async () => {
    let loadPromise = resources.actions.load(store, 'prise');

    expect(store.state.resources.prise).toMatchInlineSnapshot(`
      {
        "status": "LOADING",
        "timestamp": 1729238400000,
      }
    `);

    await loadPromise;

    expect(store.state.resources.prise).toMatchInlineSnapshot(`
      {
        "data": 100000,
        "dataTimestamp": 1729238400000,
        "isRefreshing": false,
        "refreshError": undefined,
        "status": "LOADED",
        "timestamp": 1729238400000,
      }
    `);

    vi.advanceTimersByTime(1000);

    loadPromise = resources.actions.load(store, 'prise', true);

    expect(store.state.resources.prise).toMatchInlineSnapshot(`
      {
        "data": 100000,
        "dataTimestamp": 1729238400000,
        "isRefreshing": true,
        "refreshError": undefined,
        "status": "LOADED",
        "timestamp": 1729238401000,
      }
    `);

    await loadPromise;

    expect(store.state.resources.prise).toMatchInlineSnapshot(`
      {
        "data": 100000,
        "dataTimestamp": 1729238401000,
        "isRefreshing": false,
        "refreshError": undefined,
        "status": "LOADED",
        "timestamp": 1729238401000,
      }
    `);
  });
});
