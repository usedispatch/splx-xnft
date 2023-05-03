import { ComputedStateReturn, StateDescriptor, StoreRootItem, defaultProp } from './types';
import { Json, JsonKey } from '@dispatch-services/utils-common/json';

import { computed } from '@vue/runtime-core';
import { register } from '@dispatch-services/utils-common/singleton';

interface StoreGlobals {
  computedId: number;
}

const keyPrefix = '@dispatch-services/store/vuestand/computed#';
const globals: StoreGlobals = register(() => ({ computedId: 0 }), `${keyPrefix}globals`);

function getComputedId<P, C, G, A>(descriptor: StateDescriptor<P, C, G, A>) {
  return `${descriptor.name}_${globals.computedId++}`;
}

function getComputedProp<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>, computedId: string) {
  return rootItem.computedProps[computedId];
}

export function removeComputedProp<P, C, G, A, R extends Json>(
  rootItem: StoreRootItem<P, C, G, A>,
  computedId: string,
  registry?: R
) {
  if (registry) {
    delete registry[computedId];
  }
  delete rootItem.computedProps[computedId];
}

export function hasComputedProp<P, C, G, A, R extends Json>(
  rootItem: StoreRootItem<P, C, G, A>,
  computedId: string,
  registry?: R
) {
  if (!registry) {
    return rootItem.reactive ? getComputedProp(rootItem, computedId) : false;
  }
  return Object.prototype.hasOwnProperty.call(registry, computedId);
}

export function createReadOnlyComputedProp<P, C, G, A, T>(
  rootItem: StoreRootItem<P, C, G, A>,
  key: JsonKey,
  getter: () => T
) {
  const { reactive, module, descriptor } = rootItem;
  if (typeof getter !== 'function') {
    console.warn(
      `Trying to make a computed prop for ${key.toString()} on module ${descriptor.name} that is not a function.`
    );
    return;
  }
  const get = () => getter.call(module);
  const prop = reactive ? computed(get) : undefined;
  return {
    get: (): ComputedStateReturn<typeof getter> => prop?.value ?? get(),
    prop,
    id: prop ? getComputedId(descriptor) : '',
  };
}

export function registerComputedProp<P, C, G, A, T, R extends Json>(
  rootItem: StoreRootItem<P, C, G, A>,
  key: JsonKey,
  getter: () => T,
  registry: R
) {
  const comp = createReadOnlyComputedProp(rootItem, key, getter);
  if (!comp) {
    return '';
  }
  const { get, prop, id } = comp;
  const descriptor: PropertyDescriptor = { ...defaultProp, get };
  Object.defineProperty(registry, key || id, descriptor);
  if (prop) rootItem.computedProps[id] = prop;
  return id;
}

export function createComputedProps<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  const { computed, descriptor } = rootItem;
  if (!descriptor.computed) {
    return;
  }

  return Object.entries(descriptor.computed).forEach(([key, getter]) =>
    registerComputedProp(rootItem, key, getter, computed)
  );
}

export function getComputed<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  return rootItem.computed;
}
