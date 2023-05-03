import { Recipe, StoreRootItem } from './types';
import { Ref, ShallowRef, UnwrapRef, ref, shallowRef } from '@vue/runtime-core';

import produce from 'immer';

export function createState<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  const r = rootItem.reactive;
  const i = rootItem.immutable;
  const state = rootItem.state as P;
  if (!r) {
    return;
  }
  rootItem.state = i ? shallowRef(state) : ref(state);
  rootItem.update = (updater) => {
    if (i) {
      (rootItem.state as ShallowRef<P>).value = produce((rootItem.state as ShallowRef<P>).value, updater);
    } else {
      // Just run the updater -- it will mutate the state automatically.
      updater((rootItem.state as Ref<UnwrapRef<P>>).value as any);
    }
  };
}

export function getState<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  return rootItem.reactive ? (rootItem.state as ShallowRef<P>).value : (rootItem.nonReactiveStore?.getState() as P);
}

export function setState<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>, recipe: Recipe<P>) {
  rootItem.reactive ? rootItem.update?.(recipe) : rootItem.nonReactiveStore?.setState(recipe);
}
