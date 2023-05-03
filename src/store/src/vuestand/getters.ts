import { ModuleRoot, StoreRootItem } from './types';

import { JsonKey } from '@dispatch-services/utils-common/json';
import { registerComputedProp } from './computed';

export function registerGetter<P, C, G, A, U>(
  rootItem: StoreRootItem<P, C, G, A>,
  root: ModuleRoot,
  key: JsonKey,
  getter: (...args: any) => (...args: any) => U
) {
  const get = () => getter.call(rootItem.module);
  registerComputedProp(rootItem, key, get, rootItem.getters);
}

export function createGetters<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>, root: ModuleRoot) {
  const getters = rootItem.descriptor.getters;
  if (!getters) {
    return;
  }
  Object.entries(getters).forEach(([key, getter]) => {
    registerGetter(rootItem, root, key, getter);
  });
}

export function getGetters<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  return rootItem.getters;
}
