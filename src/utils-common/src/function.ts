import { md5 } from './string';
import { register } from './singleton';

export { isNil } from 'lodash';

export async function batch<I, T>(
  items: I[],
  fn: (subset: I[], start: number, end: number) => Promise<T[]>,
  batchSize: number = 100
): Promise<Promise<Awaited<ReturnType<typeof fn>>>> {
  let values: T[] = [];
  const len = items.length;
  for (let i = 0; i < len; i += batchSize) {
    values = [...values, ...((await fn(items.slice(i, i + batchSize), i, i + batchSize)) ?? [])];
  }
  return values;
}

interface PromiseCallbacks {
  resolve: Function;
  reject: Function;
}

interface QueueRegistry {
  [fnMd5: string]: PromiseCallbacks[];
}

export function isNativeFunction(fn: Function | string) {
  const str = typeof fn === 'string' ? fn : fn.toString();
  return str.includes('[native code]');
}

export class AsyncCallbackQueue {
  private queue: QueueRegistry = {};

  private _getKey(fn: Function, queueKey?: string): string {
    const str = queueKey ?? fn.toString();
    return str.length > 1024 ? md5(str) : str;
  }

  private enqueue(key: string, resolve: Function, reject: Function) {
    if (!this.queue[key]) {
      this.queue[key] = [];
    }
    this.queue[key].push({ resolve, reject });
  }

  private dequeue(key: string, resultOrReason: any, isError: boolean = false) {
    if (!this.queue[key]) {
      return;
    }
    while (this.queue[key].length) {
      const { resolve, reject } = this.queue[key].shift() as PromiseCallbacks;
      isError ? reject(resultOrReason) : resolve(resultOrReason);
    }
    delete this.queue[key];
  }

  async execute<T>(fn: (...args: any[]) => Promise<T>, queueKey?: string): Promise<Awaited<ReturnType<typeof fn>>> {
    return await new Promise((resolve, reject) => {
      const key = this._getKey(fn, queueKey);
      this.enqueue(key, resolve, reject);
      if (this.queue[key].length > 1) {
        return;
      }
      try {
        fn()
          .then((result) => this.dequeue(key, result))
          .catch((reason) => this.dequeue(key, reason, true));
      } catch (err) {
        this.dequeue(key, err, true);
      }
    });
  }
}

const keyPrefix = '@dispatch-services/utils-common/functions#';
export const debouncer = register(() => new AsyncCallbackQueue(), `${keyPrefix}debouncer`);
