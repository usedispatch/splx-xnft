import { Listener, ModuleApi, Selector, StoreRootItem, SubscribeOptions, UnsubscribeMethod } from './types';
import { WatchStopHandle, watch } from '@vue/runtime-core';

import { registerComputedProp } from './computed';

export function unsubscribe<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>, computedId: string) {
  const { subscriptions, subscriptionGetters, computedProps } = rootItem;
  const { stopWatch } = subscriptions[computedId];
  stopWatch();
  delete subscribe[computedId];
  delete subscriptionGetters[computedId];
  delete computedProps[computedId];
}

export function subscribe<P, C, G, A, U>(
  rootItem: StoreRootItem<P, C, G, A>,
  selector: Selector<ModuleApi<P, C, G, A>, U>,
  listener: Listener<ModuleApi<P, C, G, A>, U>,
  options?: SubscribeOptions<U>
) {
  const { module, subscriptionGetters, reactive, computedProps, nonReactiveStore, subscriptions } = rootItem;
  const getter = () => selector.call(module, module);
  const computedId = registerComputedProp(rootItem, '', getter, subscriptionGetters);
  let stopWatch: WatchStopHandle;
  if (reactive) {
    const equalityFn = options?.equalityFn ?? Object.is;
    stopWatch = watch(
      computedProps[computedId],
      (n, o) => {
        if (equalityFn(n, o)) {
          return;
        }
        void listener.call(module, n, o);
      },
      options
    );
  } else {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises
    stopWatch = nonReactiveStore!.subscribe(() => subscriptionGetters[computedId], listener, options);
  }
  subscriptions[computedId] = {
    listener,
    stopWatch,
  };
  const unsub = () => unsubscribe(rootItem, computedId);
  Object.defineProperty(unsub, '$dispatchValue', {
    get() {
      return rootItem.subscriptionGetters[computedId];
    },
  });
  return unsub as UnsubscribeMethod<ReturnType<typeof selector>>;
}
