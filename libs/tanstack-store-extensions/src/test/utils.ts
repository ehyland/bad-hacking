type PausedPromise<T> = Promise<T> & PromiseCallbacks<T>;

type PromiseCallbacks<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

type PausedPromiseQueue<T = void> = {
  queue: PausedPromise<T>[];
  create: () => PausedPromise<T>;
  resumeAll: (value: T | PromiseLike<T>) => void;
  rejectAll: (reason?: any) => void;
};

const createPausedPromise = <T>(): PausedPromise<T> => {
  const callbacks: PromiseCallbacks<T> = {
    resolve: null as any,
    reject: null as any,
  };

  const promise = new Promise<T>((resolve, reject) => {
    callbacks.resolve = resolve;
    callbacks.reject = reject;
  });

  return Object.assign(promise, callbacks);
};

const createPausedPromiseQueue = <T = void>(): PausedPromiseQueue<T> => {
  const queue: PausedPromise<T>[] = [];
  return {
    queue,
    create: () => {
      const promise = createPausedPromise<T>();
      queue.push(promise);
      return promise;
    },
    resumeAll: (value) => {
      for (const promise of queue.splice(0, queue.length)) {
        promise.resolve(value);
      }
    },
    rejectAll: (reason?: any) => {
      for (const promise of queue.splice(0, queue.length)) {
        promise.reject(reason);
      }
    },
  };
};

type AnyFn = (...args: any[]) => any;

type PausedFn<TFun extends () => any> = ((
  ...args: Parameters<TFun>
) => Promise<Awaited<ReturnType<TFun>>>) & {
  resumeAll: () => void;
  rejectAll: (reason?: any) => void;
};

export function pausedFn<TFun extends AnyFn>(fn: TFun): PausedFn<TFun> {
  const queue = createPausedPromiseQueue();
  const wrapper = async (...args: Parameters<TFun>) => {
    await queue.create();
    return await fn(...args);
  };

  return Object.assign(wrapper, {
    resumeAll: () => queue.resumeAll(),
    rejectAll: (reason?: any) => queue.rejectAll(reason),
  });
}
