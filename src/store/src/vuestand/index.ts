import {
  GetState,
  Listener,
  ModuleApi,
  Selector,
  SetState,
  StateDescriptor,
  StoreModule,
  StoreModuleUseFn,
  StoreRootItem,
  SubscribeOptions,
  defaultProp,
} from './types';
import { createModule, internalRoot } from './module';
import { hasComputedProp, registerComputedProp, removeComputedProp } from './computed';

import { useSyncExternalStore } from 'react';

export { createModule } from './module';
export * from './types';
export { nextTick } from '@vue/runtime-core';

function createGetterFromSelector<P, C, G, A, U>(
  rootItem: StoreRootItem<P, C, G, A>,
  selector: Selector<ModuleApi<P, C, G, A>, U>
) {
  const getter = () => selector.call(rootItem.module, rootItem.module);
  return registerComputedProp(rootItem, '', getter, rootItem.reactGetters);
}

function useExternalStore<P, C, G, A, U>(
  module: ModuleApi<P, C, G, A>,
  selector: Selector<typeof module, U>,
  equalityFn?: SubscribeOptions<U>['equalityFn']
) {
  const rootItem: StoreRootItem<P, C, G, A> = internalRoot[module.name];
  let computedId;
  const getSnapshot = (): ReturnType<typeof selector> => {
    if (!hasComputedProp(rootItem, computedId, rootItem.reactGetters)) {
      computedId = createGetterFromSelector(rootItem, selector);
    }
    return rootItem.reactGetters[computedId];
  };
  const subscribe = (listener: Listener<typeof module, ReturnType<typeof selector>>) => {
    const unsub = module.subscribe(selector, listener, { equalityFn });
    return () => {
      removeComputedProp(rootItem, computedId, rootItem.reactGetters);
      unsub();
    };
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function mergeInModule<S extends object>(module: S, useStore: StoreModuleUseFn<S>) {
  Object.keys(module).forEach((key) => {
    Object.defineProperty(useStore, key, { ...defaultProp, get: () => module[key] });
  });
}

export function create<P, C, G, A>(
  fn: (setState: SetState<P>, getState: GetState<P>, store: ModuleApi<P, C, G, A>) => StateDescriptor<P, C, G, A>,
  isReactive: boolean = true,
  immutable: boolean = false
): StoreModule<ModuleApi<P, C, G, A>> {
  const module = createModule(fn, isReactive, immutable);
  function useStore<U>(selector: Selector<typeof module, U>, equalityFn?: SubscribeOptions<U>['equalityFn']) {
    return useExternalStore(module, selector, equalityFn);
  }
  mergeInModule(module, useStore);
  return useStore as StoreModule<typeof module>;
}
