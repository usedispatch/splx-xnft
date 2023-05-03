import {
  GetState,
  Listener,
  ModuleApi,
  ModuleRoot,
  Recipe,
  Selector,
  SetState,
  StateDescriptor,
  StoreRoot,
  StoreRootItem,
  SubscribeOptions,
} from './types';
import { createActions, getActions } from './actions';
import { createComputedProps, getComputed } from './computed';
import { createGetters, getGetters } from './getters';
import { createState, getState, setState } from './state';
import { isDevelopment, isReactiveEnv } from '@dispatch-services/utils-common/env';
import { subscribe, unsubscribe } from './subscriptions';

import createStore from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import { register } from '@dispatch-services/utils-common/singleton';
import { subscribeWithSelector } from 'zustand/middleware';

const keyPrefix = '@dispatch-services/state/vuestand/module#';
export const internalRoot: StoreRoot = register(() => ({}), `${keyPrefix}internalRoot`);
const storeRoot: ModuleRoot = register(() => ({}), `${keyPrefix}storeRoot`);

function initializeRootItem<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  rootItem.initialized = true;
  createState(rootItem);
  createComputedProps(rootItem);
  createGetters(rootItem, storeRoot);
  createActions(rootItem, storeRoot);

  return rootItem;
}

function getRootItem<P, C, G, A>(descriptor: StateDescriptor<P, C, G, A>) {
  const item = internalRoot[descriptor.name] as StoreRootItem<P, C, G, A>;
  return item.initialized ? item : initializeRootItem(item);
}

function registerModule<P, C, G, A>(
  descriptor: StateDescriptor<P, C, G, A>,
  api: ModuleApi<P, C, G, A>,
  isReactive: boolean,
  immutable: boolean
) {
  if (internalRoot[descriptor.name]) {
    if (isDevelopment()) {
      console.warn(
        'If you are getting this and it is not a hot reload, this is going to error in prod.',
        descriptor.name
      );
      return;
    } else {
      throw new Error('@dispatch-services/store/vuestand#noReRegister');
    }
  }
  internalRoot[descriptor.name] = {
    initialized: false,
    descriptor,
    state: descriptor.state,
    computed: {},
    getters: {},
    actions: {},
    module: api,
    reactive: isReactive,
    immutable,
    computedProps: {},
    reactGetters: {},
    subscriptions: {},
    subscriptionGetters: {},
  };
  if (!isReactive) {
    internalRoot[descriptor.name].nonReactiveStore = createStore(
      immer(subscribeWithSelector(() => internalRoot[descriptor.name].state))
    ) as any;
  }
  storeRoot[descriptor.name] = api;
}

function destroy<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  const { subscriptions } = rootItem;
  Object.keys(subscriptions).forEach((computedId) => unsubscribe(rootItem, computedId));
}

export function createModule<P, C, G, A>(
  fn: (setState: SetState<P>, getState: GetState<P>, store: ModuleApi<P, C, G, A>) => StateDescriptor<P, C, G, A>,
  isReactive: boolean = true,
  immutable: boolean = false
) {
  if (!isReactiveEnv()) {
    isReactive = false;
  }
  const api: ModuleApi<P, C, G, A> = {
    getState() {
      return getState(rootItem);
    },
    setState(recipe: Recipe<P>) {
      setState(rootItem, recipe);
    },
    subscribe<U>(
      selector: Selector<ModuleApi<P, C, G, A>, U>,
      listener: Listener<ModuleApi<P, C, G, A>, U>,
      options?: SubscribeOptions<U>
    ) {
      return subscribe(rootItem, selector, listener, options);
    },
    destroy() {
      destroy(rootItem);
    },
    get name() {
      return stateDescriptor.name;
    },
    get state() {
      return this.getState();
    },
    get computed() {
      return getComputed(rootItem);
    },
    get getters() {
      return getGetters(rootItem);
    },
    get actions() {
      return getActions(rootItem);
    },
    get root() {
      return storeRoot;
    },
  };
  const stateDescriptor = fn(api.setState, api.getState, api);
  registerModule(stateDescriptor, api, isReactive, immutable);
  const rootItem = getRootItem(stateDescriptor);
  return api;
}
