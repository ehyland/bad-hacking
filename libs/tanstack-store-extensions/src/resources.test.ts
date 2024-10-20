import { type ImmerStore, createStore } from './create-store';
import { type InferStateSlice, defineResources } from './resources';
import { pausedFn } from './test/utils';

vi.useFakeTimers({
  now: new Date('2024-10-18T08:00:00.000Z'),
});

describe('resources', () => {
  const api = {
    prise: pausedFn(() => 100_000),
    flashMessages: pausedFn(() => ['Save 10% today only']),
    maintenanceMode: pausedFn(() => false),
  };

  const resources = defineResources({
    prise: { loader: api.prise },
    flashMessages: { loader: api.flashMessages },
    maintenanceMode: { loader: api.maintenanceMode },
  });

  type State = InferStateSlice<typeof resources>;

  let store: ImmerStore<State>;

  beforeEach(() => {
    store = createStore<State>({
      initialState: { ...resources.initialStateSlice },
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

  describe('when load is called ', () => {
    let loadPromise: Promise<void>;
    let loadTime: number;

    beforeEach(() => {
      loadTime = Date.now();
      loadPromise = resources.actions.load(store, 'prise');
    });

    it('sets the loading state', () => {
      expect(store.state.resources.prise).toEqual({
        status: 'LOADING',
        timestamp: loadTime,
      });
    });

    describe('on api error', () => {
      let errorTime: number;

      beforeEach(async () => {
        vi.advanceTimersByTime(1000);
        errorTime = Date.now();
        api.prise.rejectAll();
        await loadPromise;
      });

      it('enters error state', () => {
        expect(store.state.resources.prise).toEqual({
          status: 'ERROR',
          errorMessage: 'An error occurred',
          timestamp: errorTime,
        });
      });
    });

    describe('when api resolves ', () => {
      let loadedTime: number;

      beforeEach(async () => {
        vi.advanceTimersByTime(1000);
        loadedTime = Date.now();
        api.prise.resumeAll();
        await loadPromise;
      });

      it('sets the data', () => {
        expect(store.state.resources.prise).toEqual({
          data: 100000,
          dataTimestamp: loadedTime,
          isRefreshing: false,
          refreshError: undefined,
          status: 'LOADED',
          timestamp: loadedTime,
        });
      });

      it('does nothing when load is called again without refresh', async () => {
        const initial = store.state.resources.prise;
        const loadAgainPromise = resources.actions.load(store, 'prise');
        expect(store.state.resources.prise).toEqual(initial);
        api.prise.resumeAll();
        await loadAgainPromise;
        expect(store.state.resources.prise).toEqual(initial);
      });

      describe('on refresh', () => {
        let refreshRequestTime: number;
        let refreshRequestPromise: Promise<void>;

        beforeEach(async () => {
          vi.advanceTimersByTime(1000);
          refreshRequestTime = Date.now();
          refreshRequestPromise = resources.actions.load(store, 'prise', true);
        });

        it('sets refresh flag', () => {
          expect(store.state.resources.prise).toEqual({
            data: 100000,
            dataTimestamp: loadedTime,
            isRefreshing: true,
            refreshError: undefined,
            status: 'LOADED',
            timestamp: refreshRequestTime,
          });
        });

        it('ignores refresh requests while loading', async () => {
          vi.advanceTimersByTime(1000);
          resources.actions.load(store, 'prise', true);
          expect(store.state.resources.prise).toEqual({
            data: 100000,
            dataTimestamp: loadedTime,
            isRefreshing: true,
            refreshError: undefined,
            status: 'LOADED',
            timestamp: refreshRequestTime,
          });
        });

        describe('on refresh load', () => {
          let refreshedTime: number;

          beforeEach(async () => {
            vi.advanceTimersByTime(1000);
            refreshedTime = Date.now();
            api.prise.resumeAll();
            await refreshRequestPromise;
          });

          it('updates fields', () => {
            expect(store.state.resources.prise).toEqual({
              data: 100000,
              dataTimestamp: refreshedTime,
              isRefreshing: false,
              refreshError: undefined,
              status: 'LOADED',
              timestamp: refreshedTime,
            });
          });
        });

        describe('on refresh error', () => {
          let errorTime: number;

          beforeEach(async () => {
            vi.advanceTimersByTime(1000);
            errorTime = Date.now();
            api.prise.rejectAll();
            await refreshRequestPromise;
          });

          it('remains in loaded state with error message', () => {
            expect(store.state.resources.prise).toEqual({
              data: 100000,
              dataTimestamp: loadedTime,
              isRefreshing: false,
              refreshError: 'An error occurred',
              status: 'LOADED',
              timestamp: errorTime,
            });
          });
        });
      });
    });
  });

  it.skip('sets loading state while', async () => {
    let loadPromise = resources.actions.load(store, 'prise');

    expect(store.state.resources.prise).toMatchInlineSnapshot(`
      {
        "status": "LOADING",
        "timestamp": 1729238400000,
      }
    `);

    api.prise.resumeAll();
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

    api.prise.resumeAll();
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
