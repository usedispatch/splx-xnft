import store, { StoreType } from 'store2';

import { create } from '@dispatch-services/store/vuestand';

export const useLocalStorage = create(() => ({
  name: 'localStorage',
  state: {
    namespace: '',
    store: undefined as StoreType | undefined,
  },
  actions: {
    async setNamespace(prefix: string) {
      this.setState((state) => {
        state.namespace = prefix;
        state.store = prefix ? store.namespace(prefix) : undefined;
      });
    },
    async get<T>(key: string): Promise<T | undefined> {
      return this.state.store?.(key);
    },
    async set<T>(key: string, value: T): Promise<typeof value | undefined> {
      this.state.store?.(key, value);
      return this.state.store?.(key);
    },
    async clearAll() {
      this.state.store?.clearAll();
    },
  },
}));
