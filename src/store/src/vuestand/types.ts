import { ComputedRef, Ref, ShallowRef, UnwrapRef, WatchOptions, WatchStopHandle } from '@vue/runtime-core';
import { Json, JsonKey } from '@dispatch-services/utils-common/json';
import { Mutate, StoreApi } from 'zustand';

import { Draft } from 'immer/dist/internal';

export type ComputedStateReturn<T> = T extends (...args: any[]) => any ? ReturnType<T> : null;

export type ComputedState<C> = {
  [K in keyof C as C[K] extends (...args: any) => any ? K : never]: ComputedStateReturn<C[K]>;
};

type Method = (...args: any) => any;

export type GetterState<G> = {
  [K in keyof G as G[K] extends Method ? K : never]: G[K] extends Method
    ? ReturnType<G[K]> extends (...args: infer P) => infer R
      ? (...args: P) => R
      : never
    : never;
};

export type ActionState<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? K : never]: A[K] extends (...arg: infer P) => infer R
    ? (...args: P) => R
    : never;
};

type ActionStateActionKeyGetters<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? `${string & K}ActionKey` : never]: A[K] extends (
    ...args: infer P
  ) => Promise<any>
    ? (...args: P) => string
    : never;
};

type ActionStateBusyGetters<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? `${string & K}IsBusy` : never]: A[K] extends (
    ...args: infer P
  ) => Promise<any>
    ? (...args: P) => boolean
    : never;
};

type ActionStateIdleGetters<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? `${string & K}IsIdle` : never]: A[K] extends (
    ...args: infer P
  ) => Promise<any>
    ? (...args: P) => boolean
    : never;
};

type ActionStateLoadingGetters<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? `${string & K}IsLoading` : never]: A[K] extends (
    ...args: infer P
  ) => Promise<any>
    ? (...args: P) => boolean
    : never;
};

type ActionStateErrorGetters<A> = {
  [K in keyof A as A[K] extends (...args: any) => Promise<any> ? `${string & K}Error` : never]: A[K] extends (
    ...args: infer P
  ) => Promise<any>
    ? (...args: P) => Error | undefined
    : never;
};

type ActionStateGetters<A> = ActionStateActionKeyGetters<A> &
  ActionStateBusyGetters<A> &
  ActionStateIdleGetters<A> &
  ActionStateLoadingGetters<A> &
  ActionStateErrorGetters<A>;

interface Subscription<S, U = any> {
  listener: Listener<S, U>;
  stopWatch: WatchStopHandle;
}

interface Subscriptions<S> {
  [computedId: number]: Subscription<S>;
}

interface ComputedProps {
  [computedId: string]: ComputedRef;
}

export interface State<P, C, G, A> {
  state: P;
  computed: ComputedState<C>;
  getters: GetterState<G> & ActionStateGetters<A>;
  actions: ActionState<A>;
}

type StateScope<P, C, G, A> = ThisType<ModuleApi<P, C, G, A>>;

export interface StateDescriptor<P = any, C = any, G = any, A = any> {
  name: string;
  state: P;
  computed?: C & StateScope<P, C, G, A>;
  getters?: G & StateScope<P, C, G, A>;
  actions?: A & StateScope<P, C, G, A>;
}

export type NonReactiveStore<P> = Mutate<
  StoreApi<P>,
  [['zustand/immer', unknown], ['zustand/subscribeWithSelector', unknown]]
>;

export type Recipe<T> = (draft: Draft<T>) => void;
type Updater<T> = (recipe: Recipe<T>) => void;
export type Selector<S, U> = (this: S, store: S) => U;
export type Listener<S, U> = (this: S, selectedState: U, previousSelectedState: U) => void | Promise<void>;
export interface SubscribeOptions<U> extends WatchOptions {
  equalityFn?: (a: U, b: U) => boolean;
  fireImmediately?: boolean;
}
export type GetState<P> = () => P;
export type SetState<P> = (recipe: Recipe<P>) => void;
export interface UnsubscribeMethod<U> {
  (): void;
  $dispatchValue: U;
}

export interface ModuleApi<P, C, G, A> {
  getState: GetState<P>;
  setState: SetState<P>;
  subscribe: <U>(
    selector: Selector<ModuleApi<P, C, G, A>, U>,
    listener: Listener<ModuleApi<P, C, G, A>, ReturnType<typeof selector>>,
    options?: SubscribeOptions<ReturnType<typeof selector>>
  ) => UnsubscribeMethod<U>;
  destroy: () => void;
  name: string;
  state: P;
  computed: ComputedState<C>;
  getters: GetterState<G> & ActionStateGetters<A>;
  actions: ActionState<A>;
  root: ModuleRoot;
}

export interface StoreRootItem<P, C, G, A> {
  initialized: boolean;
  descriptor: StateDescriptor<P, C, G, A>;
  state: P | ShallowRef<P> | Ref<UnwrapRef<P>>;
  computed: ComputedState<C>;
  getters: GetterState<G> & ActionStateGetters<A>;
  actions: ActionState<A>;
  module: ModuleApi<P, C, G, A>;
  reactive: boolean;
  immutable: boolean;
  computedProps: ComputedProps;
  reactGetters: Json;
  subscriptionGetters: Json;
  subscriptions: Subscriptions<ModuleApi<P, C, G, A>>;
  update?: Updater<P>;
  nonReactiveStore?: NonReactiveStore<P>;
}

export interface StoreRoot {
  [name: JsonKey]: StoreRootItem<any, any, any, any>;
}

export interface ModuleRoot {
  [name: JsonKey]: ModuleApi<any, any, any, any>;
}

export const defaultProp: PropertyDescriptor = { enumerable: true, configurable: true };

export type StoreModuleUseFn<S> = <U>(selector: Selector<S, U>, equalityFn?: SubscribeOptions<U>['equalityFn']) => U;

export type StoreModule<S> = StoreModuleUseFn<S> & S;

export type ModuleGetter<This> = (this: This) => (...args: any[]) => any;

export type ModuleComputed<This> = (this: This) => any;

export type ModuleAction<This> = (this: This, ...args: any[]) => Promise<void>;
