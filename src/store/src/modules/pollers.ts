import { Poller, PollingResponseState, PollingState } from '@dispatch-services/utils-common/timers';

import { JsonKey } from '@dispatch-services/utils-common/json';
import { create } from '@dispatch-services/store/vuestand';
import { debouncer } from '@dispatch-services/utils-common/function';

type Method = (...args: any[]) => any;
type AsyncMethod = (...args: any[]) => Promise<any>;
type IsDoneCallback = (...args: any[]) => Promise<boolean>;

interface PollerState {
  initialized: boolean;
  pollers: { [pollerKey: JsonKey]: Poller };
  pollerCallbacks: { [pollerId: string]: AsyncMethod };
  pollerHistory: { [pollerKey: JsonKey]: 1 };
  pollersToIgnore: { [pollerKey: JsonKey]: 1 };
}

interface StartPollerPayload {
  pollerKey: JsonKey;
  onPollCallback: IsDoneCallback;
  onDoneCallback?: Method | AsyncMethod;
  startCallback?: Method;
  stopCallback?: Method;
  waitCallback?: Method | AsyncMethod;
  pollTime?: number;
  backoff?: number;
  ignore?: boolean;
  resolveOnLoad?: boolean;
}

function initialState(): PollerState {
  return {
    initialized: false,
    pollers: {},
    pollerCallbacks: {},
    pollerHistory: {},
    pollersToIgnore: {},
  };
}

type ReturnCallback<T> = T extends AsyncMethod ? Awaited<ReturnType<T>> : T extends Method ? ReturnType<T> : undefined;

const keyPrefix = '@disptach-services/store/modules/pollers#';

export const usePollers = create(() => ({
  name: 'pollers',
  state: initialState(),
  computed: {
    isAnyPollerRunning() {
      const pollerKeys = this.computed.unignoredPollerKeys;
      for (let i = 0; i < pollerKeys.length; i++) {
        if (this.getters.isRunning(pollerKeys[i]) && !this.getters.isLoadingForTheFirstTime(pollerKeys[i])) {
          return true;
        }
      }
      return false;
    },
    minSecondsToNextPoll() {
      return this.computed.unignoredPollerKeys.reduce((acc, pollerKey) => {
        const seconds = this.getters.getSecondsToNextPoll(pollerKey);
        return acc > seconds ? seconds : acc;
      }, Infinity);
    },
    unignoredPollerKeys() {
      return Object.keys(this.state.pollers).filter((pollerKey) => !this.state.pollersToIgnore[pollerKey]);
    },
  },
  getters: {
    getPoller() {
      return (pollerKey: JsonKey) => this.state.pollers[pollerKey];
    },
    getPollerId() {
      return (pollerKey: JsonKey) => this.state.pollers[pollerKey]?.id;
    },
    getPollerCallback() {
      return (pollerKey: JsonKey) =>
        this.state.pollerCallbacks[this.getters.getPollerId(pollerKey)] ?? async function fallback() {};
    },
    getPollingState() {
      return (pollerKey: JsonKey) => {
        const poller = this.getters.getPoller(pollerKey);
        return poller?.pollingState ?? PollingState.unknown;
      };
    },
    getPollingResponseState() {
      return (pollerKey: JsonKey) => this.getters.getPoller(pollerKey)?.responseState ?? PollingResponseState.unknown;
    },
    getSecondsToNextPoll() {
      return (pollerKey: JsonKey) => {
        const poller = this.getters.getPoller(pollerKey);
        const delta = poller ? poller.nextPollTime - this.root.time.state.time : 0;
        return delta > 0 ? Math.round(delta / 1000) : 0;
      };
    },
    hasLoadedPoller() {
      return (pollerKey: JsonKey) => {
        const poller = this.getters.getPoller(pollerKey);
        return this.state.pollerHistory[pollerKey] || (poller && !poller?.isLoading);
      };
    },
    isPolling() {
      return (pollerKey: JsonKey) => this.getters.getPollingState(pollerKey) === PollingState.polling;
    },
    isLoading() {
      return (pollerKey: JsonKey) => this.getters.getPollingState(pollerKey) === PollingState.loading;
    },
    isLoadingForTheFirstTime() {
      return (pollerKey: JsonKey) => !this.state.pollerHistory[pollerKey] && this.getters.isLoading(pollerKey);
    },
    isRunning() {
      return (pollerKey: JsonKey) => this.getters.getPoller(pollerKey)?.isRunning;
    },
    shouldCommitLoadedPoller() {
      return (pollerKey: JsonKey) => this.getters.hasLoadedPoller(pollerKey) && !this.state.pollerHistory[pollerKey];
    },
  },
  actions: {
    async startPoller(pollerOptions: StartPollerPayload) {
      if (pollerOptions.pollerKey !== 'timePoller' && !this.state.initialized) {
        await debouncer.execute(async () => {
          await this.root.time.actions.keepTrackOfTime();
          this.setState((state) => {
            state.initialized = true;
          });
        }, `${keyPrefix}startPoller-initialize`);
      }
      return await new Promise((resolve) => {
        const { pollerKey, ignore, resolveOnLoad } = pollerOptions;
        const poller = this.getters.getPoller(pollerKey);
        if (!poller) {
          const poller = new Poller({
            backoff: pollerOptions.backoff ?? 1.2,
            pollTime: pollerOptions.pollTime ?? 5000,
            callback: async () => {
              const isDone = await pollerOptions.onPollCallback();
              if (isDone) {
                await this.actions.stopPoller(pollerKey);
              }
              return isDone;
            },
            startCallback: () => {
              pollerOptions.startCallback?.();
            },
            stopCallback: () => {
              pollerOptions.stopCallback?.();
            },
            waitCallback: () => {
              if (this.getters.shouldCommitLoadedPoller(pollerKey)) {
                this.setState((state) => {
                  state.pollerHistory[pollerKey] = 1;
                });
                resolveOnLoad && resolve(undefined);
              }
              pollerOptions.waitCallback?.();
            },
          });
          this.setState((state) => {
            state.pollers[pollerKey] = poller;
            if (!state.pollerCallbacks[poller.id]) {
              state.pollerCallbacks[poller.id] = async (): Promise<
                ReturnCallback<typeof pollerOptions.onDoneCallback>
              > => {
                const v = await pollerOptions.onDoneCallback?.();
                (!resolveOnLoad || (resolveOnLoad && !this.state.pollerHistory[pollerKey])) && resolve(v);
                return v;
              };
            }
            if (ignore) {
              state.pollersToIgnore[pollerKey] = 1;
            }
          });
          poller.start();
        } else {
          resolve(undefined);
        }
      });
    },
    async stopPoller(pollerKey: JsonKey) {
      const poller = this.getters.getPoller(pollerKey);
      if (!poller) {
        return;
      }
      poller.stop();
      if (this.getters.shouldCommitLoadedPoller(pollerKey)) {
        this.setState((state) => {
          state.pollerHistory[pollerKey] = 1;
        });
      }
      // Execute the callback
      await this.getters.getPollerCallback(pollerKey)();
      // Unregister the poller and the callback.
      this.setState((state) => {
        delete state.pollers[pollerKey];
        delete state.pollerCallbacks[poller.id];
      });
    },
  },
}));
