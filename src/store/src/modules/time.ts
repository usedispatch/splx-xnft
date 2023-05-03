import { AxiosResponseHeaders } from '@dispatch-services/utils-common/http';
import { create } from '@dispatch-services/store/vuestand';
import { now as getTime } from '@dispatch-services/utils-common/timers';

const minute = 1000 * 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;

export const useTime = create(() => ({
  name: 'time',
  state: {
    time: getTime(), // local time (performance or Date.now())
    localTimeSet: -1, // local time (Date.now()) when time was set
    _doNotUse_serverTime: 0, // time returned in date header of request
    serverTimeSet: -1, // local time (Date.now()) when server time was set
    timeWait: 0,
    pollTime: 500,
  },
  getters: {
    getDateAge() {
      return (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const age = Date.now() - date.getTime();
        // minutes, hours, days, weeks, months, years
        if (age > year) {
          const years = Math.floor(age / (1000 * 60 * 60 * 24 * 365));
          return `${years} year${years > 1 ? 's' : ''} ago`;
        }
        if (age > month) {
          const months = Math.floor(age / (1000 * 60 * 60 * 24 * 30));
          return `${months} month${months > 1 ? 's' : ''} ago`;
        }
        if (age > week) {
          const weeks = Math.floor(age / (1000 * 60 * 60 * 24 * 7));
          return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        if (age > day) {
          const days = Math.floor(age / (1000 * 60 * 60 * 24));
          return `${days} day${days ? 's' : ''} ago`;
        }
        if (age > hour) {
          const hours = Math.floor(age / (1000 * 60 * 60));
          return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        if (age > minute) {
          const minutes = Math.floor(age / (1000 * 60));
          return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
      };
    },
    getFormattedDate() {
      return (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const format: Intl.DateTimeFormatOptions = {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
        };
        return date.toLocaleDateString(undefined, { ...format });
      };
    },
  },
  computed: {
    serverTime() {
      if (this.state._doNotUse_serverTime < 0) return Date.now();
      // Note(Partyman): User can change their time on their machine at any time, so this
      // will not be accurate if a request hasn't been made in a while.
      return this.state._doNotUse_serverTime + (this.state.localTimeSet - this.state.serverTimeSet);
    },
    serverTimeSec() {
      return parseInt(`${this.computed.serverTime / 1000}`);
    },
  },
  actions: {
    async keepTrackOfTime() {
      return await new Promise<void>((resolve) => {
        const pollerOptions = {
          pollerKey: 'timePoller',
          onPollCallback: async () => {
            await this.actions.increment();
            return false;
          },
          startCallback: () => {
            this.setState((state) => {
              state.timeWait = Date.now();
            });
          },
          waitCallback: () => {
            this.setState((state) => {
              state.timeWait = Date.now();
            });
          },
          pollTime: this.state.pollTime,
          backoff: 1,
          ignore: true,
          resolveOnLoad: true,
        };
        (this.root.pollers.actions.startPoller as (options) => Promise<any>)(pollerOptions).finally(() => resolve());
      });
    },
    async increment() {
      const now = Date.now();
      const delta = now - (this.state.timeWait ?? now);
      const maybeTimeChange = delta < this.state.pollTime || delta > 10 * this.state.pollTime;
      // If delta is less than pollTime or significantly more than pollTime then maybe local time changed?
      if (maybeTimeChange && this.state.localTimeSet > -1 && this.state.serverTimeSet > -1) {
        const adjustment = now - this.state.localTimeSet + this.state.pollTime;
        this.setState((state) => {
          state.serverTimeSet += adjustment;
        });
      }
      this.setState((state) => {
        state.localTimeSet = now;
        state.time = getTime();
      });
    },
    async updateServerTime(headers: AxiosResponseHeaders) {
      if (!headers.date) return;
      this.setState((state) => {
        state.serverTimeSet = Date.now();
        state._doNotUse_serverTime = new Date(headers.date ?? '').getTime();
      });
    },
  },
}));
