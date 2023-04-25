import { binaryInsert } from './array';
import { getGlobal } from './global';
import { isNil } from './function';
import { register } from './singleton';

const keyPrefix = '@dispatch-services/utils-common/timers#';
const canUsePerformance = register(() => !!getGlobal().performance, `${keyPrefix}canUsePerformance`);

export function now(useDate: boolean = false) {
  if (canUsePerformance && !useDate) {
    return performance.now();
  }
  return Date.now();
}

export function nowSec() {
  return parseInt(`${now(true) / 1000}`);
}

export async function sleep(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

const noop: Function = () => {};

export interface PollOptions {
  callback: Function;
  startCallback?: Function;
  stopCallback?: Function;
  waitCallback?: Function;
  pollTime?: number;
  backoff?: number;
}

let pollerCt: number = 0;
function generatePollerId(): string {
  return `poller_${pollerCt++}`;
}

export enum PollingState {
  unknown = -1,
  stopped = 0,
  loading = 1,
  polling = 2,
  waiting = 3,
}

export enum PollingResponseState {
  unknown = -1,
  loading = 0,
  okay = 1,
  error = 2,
}

export class Poller {
  public readonly id: string = '';

  private started: boolean = false;

  public readonly pollTime: number = 6500;

  private __waitTime: number = 6500;

  private count: number = 0;

  private successCount: number = -1;

  private errorCount: number = -1;

  private previousValue: any = null;

  public currentValue: any = null;

  private __pollAgainTime: number = 0;

  private __pollingState: PollingState = PollingState.stopped;

  private __responseState: PollingResponseState = PollingResponseState.loading;

  private readonly callback: Function = noop;

  private readonly waitCallback: Function = noop;

  private readonly startCallback: Function = noop;

  private readonly stopCallback: Function = noop;

  private readonly backoff: number = 1.2;

  public get isLoading(): boolean {
    return this.successCount === -1;
  }

  public get hasError(): boolean {
    return this.count === this.errorCount;
  }

  public get sameValue(): boolean {
    return this.currentValue === this.previousValue;
  }

  public get pollingState(): PollingState {
    return this.__pollingState;
  }

  public get responseState(): PollingResponseState {
    return this.__responseState;
  }

  public get nextPollTime(): number {
    return this.__pollAgainTime;
  }

  public get waitTime(): number {
    const increaseWaitTime = this.hasError || this.sameValue;
    if (increaseWaitTime) {
      this.__waitTime *= this.backoff;
    } else {
      this.__waitTime = this.pollTime;
    }
    return this.__waitTime;
  }

  public get isRunning() {
    return this.started;
  }

  public get isOkay(): boolean {
    return this.responseState === PollingResponseState.okay;
  }

  constructor(pollOptions: PollOptions) {
    this.id = generatePollerId();
    this.callback = pollOptions.callback;
    if (pollOptions.startCallback) {
      this.startCallback = pollOptions.startCallback;
    }
    if (pollOptions.stopCallback) {
      this.stopCallback = pollOptions.stopCallback;
    }
    if (pollOptions.waitCallback) {
      this.waitCallback = pollOptions.waitCallback;
    }
    if (pollOptions.pollTime) {
      this.pollTime = pollOptions.pollTime;
      this.__waitTime = pollOptions.pollTime;
    }
    if (pollOptions.backoff) {
      this.backoff = pollOptions.backoff;
    }
  }

  getWaitTime(...args): number {
    return this.waitTime;
  }

  async executeCallback(...args): Promise<any> {
    const returnValue = await this.callback(...args);
    return returnValue;
  }

  async poll(): Promise<any> {
    if (!this.started) {
      return;
    }
    await this.performPoll();
  }

  async performPoll(...args): Promise<any> {
    this.count++;
    this.setPollingState(this.isLoading ? PollingState.loading : PollingState.polling);
    try {
      const returnValue = await this.executeCallback(...args);
      this.previousValue = this.currentValue;
      this.currentValue = returnValue;
      this.successCount = this.count;
    } catch (err) {
      console.log('poller_errorPerformPoll', err);
      this.errorCount = this.count;
    }
    this.setResponseState(this.hasError ? PollingResponseState.error : PollingResponseState.okay);
    return await this.pollAgain(this.getWaitTime(...args));
  }

  async pollAgain(time: number): Promise<any> {
    this.__pollAgainTime = now(true) + time;
    this.setPollingState(PollingState.waiting);
    await this.waitCallback();
    await sleep(time);
    await this.poll();
  }

  private setPollingState(state: PollingState) {
    this.__pollingState = state;
  }

  private setResponseState(state: PollingResponseState) {
    this.__responseState = state;
  }

  start() {
    this.started = true;
    this.startCallback();
    this.poll().finally(() => {});
  }

  stop() {
    this.started = false;
    this.setPollingState(PollingState.stopped);
    this.stopCallback();
  }
}

export async function retry<T>(
  method: (...args: any[]) => Promise<T>,
  retries: number = 3,
  retryDelay: number = 200,
  onRetry?: (err: any, retry: number, retries: number) => number | undefined
): Promise<Awaited<ReturnType<typeof method>>> {
  let retry = 0;
  let output: any;
  let success = false;
  let error: any;
  let retryChanged = false;
  let retryCt = 0;
  while (retry < retries && !success) {
    try {
      output = await method(retry);
      success = true;
      break;
    } catch (err: any) {
      error = err;
    }

    if (onRetry && !retryChanged) {
      let proposedRetry = onRetry(error, retry, retries);
      proposedRetry = isNil(retry) ? Infinity : proposedRetry;
      retryChanged = retry !== proposedRetry;
      retry = proposedRetry as number;
    }

    if (retry < retries) {
      retryCt++;
      await sleep(retryCt * retryDelay);
    }
    retry++;
  }
  if (!success) {
    throw error ? (error as Error) : new Error('Retries failed');
  }
  return output;
}

export type SchedulerMethod = (item: SchedulerQueueItem, ...args: any[]) => Promise<any>;

export interface SchedulerQueueItem {
  delay: number;
  time: number;
  method: SchedulerMethod;
  arguments: any[];
  id?: string;
}

export class Scheduler {
  private readonly queue: SchedulerQueueItem[] = [];

  private to: any = undefined;

  private clearOnReturn: boolean = false;

  inFlight: SchedulerQueueItem | undefined;

  get isIdle(): boolean {
    return !this.queue.length && !this.inFlight;
  }

  insert(method: SchedulerMethod, delay: number, id?: string, ...args) {
    if (this.clearOnReturn) {
      // Then it's stopping and we shouldn't insert.
      return;
    }
    const time = Date.now() + delay;
    binaryInsert(this.queue, { method, time, delay, id, arguments: args }, (i) => i.time);
    this.adjustTimeout();
  }

  pushToBack(id: string) {
    const idx = this.queue.findIndex((i) => i.id === id);
    if (idx < 0) {
      return;
    }
    const item = this.queue.splice(idx, 1)[0];
    const lastTime = this.queue[this.queue.length - 1]?.time ?? item.time;
    item.time = lastTime + item.delay;
    binaryInsert(this.queue, item, (i) => i.time);
    this.adjustTimeout();
  }

  adjustTimeout() {
    if (!this.queue.length) {
      return;
    }
    this.stop();
    const delay = Math.max(this.queue[0].time - Date.now(), 0);
    this.to = setTimeout(() => {
      this.callScheduledItem().finally(() => {});
    }, delay);
  }

  stop() {
    this.to && clearTimeout(this.to);
    this.to = undefined;
  }

  async clear() {
    if (this.inFlight) {
      this.clearOnReturn = true;
      return;
    }
    this.clearOnReturn = false;
    this.stop();
    this.queue.splice(0, this.queue.length);
  }

  async callScheduledItem() {
    const item = this.queue.splice(0, 1)[0];
    if (item) {
      this.inFlight = item;
      try {
        await item.method(item, ...item.arguments);
      } catch (err) {
      } finally {
        this.inFlight = undefined;
        this.clearOnReturn && (await this.clear());
      }
    }
    this.adjustTimeout();
  }
}

export async function callWithTimeout<T>(
  fn: (...args: any[]) => Promise<T>,
  timeout: number = -1
): Promise<Awaited<ReturnType<typeof fn> | undefined>> {
  timeout = timeout < 0 ? Infinity : timeout;
  return await new Promise((resolve, reject) => {
    let done = false;
    const to = setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      resolve(undefined);
    }, timeout);
    fn()
      .then((result) => {
        if (done) {
          return;
        }
        done = true;
        clearTimeout(to);
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function raf(fn: (...args: any[]) => void) {
  return globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(() => fn()) : setTimeout(() => fn(), 0);
}

export async function tryEachAnimationFrame(
  fn: (...args: any[]) => boolean | undefined,
  timeout: number = 2 * 1000
): Promise<void> {
  return await new Promise((resolve, reject) => {
    const time = now();
    function attemptRaf() {
      raf(() => {
        const done = fn();
        !!done || now() - time > timeout ? resolve() : attemptRaf();
      });
    }
    attemptRaf();
  });
}
