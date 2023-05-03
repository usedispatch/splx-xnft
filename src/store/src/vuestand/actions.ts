import { JsonKey, isEmpty } from '@dispatch-services/utils-common/json';
import { ModuleRoot, StoreRootItem, defaultProp } from './types';
import { Ref, UnwrapRef, ref } from '@vue/runtime-core';

import { debouncer } from '@dispatch-services/utils-common/function';
import { isLocal } from '@dispatch-services/utils-common/env';
import { md5 } from '@dispatch-services/utils-common/string';
import { register } from '@dispatch-services/utils-common/singleton';
import { registerGetter } from './getters';

enum ActionStatus {
  Loading = 'loading',
  Busy = 'busy',
  Error = 'error',
  Idle = 'idle',
  New = 'new',
}

interface ActionState {
  count: number;
  errorCount: number;
  status: ActionStatus;
  lastError?: Error;
}

interface ActionStatePayload<P, C, G, A> {
  store: StoreRootItem<P, C, G, A>;
  actionName: string;
  payload: any[];
  executingActionId?: number;
  key?: string;
}

interface ActionsGlobals {
  alreadyWarned: { [prefix: string]: number };
  state: { [actionKey: string]: ActionState };
  executingActions: { [id: number]: string[] };
  actionKeyToExecutingActionId: { [actionKey: string]: { [id: number]: 1 } };
  currentExecutingActionId: number;
  ct: number;
}

const keyPrefix = '@dispatch-services/store/vuestand/actions#';
const globals: Ref<UnwrapRef<ActionsGlobals>> = register(
  () =>
    ref({
      alreadyWarned: {},
      state: {},
      actionKeyToExecutingActionId: {},
      ct: 0,
      currentExecutingActionId: 0,
      executingActions: {},
    }),
  `${keyPrefix}globals`
);

function getActionKeyFromPayload(payload: any[]): string | undefined {
  for (let i = 0; i < payload.length; i++) {
    if (payload[i]?.storeActionKey) {
      return payload[i]?.storeActionKey;
    }
  }
}

function maybeWarnPayload<P, C, G, A>(
  prefix: string,
  payloadStr: string,
  statePayload: ActionStatePayload<P, C, G, A>
) {
  if (payloadStr.length < 16384 || globals.value.alreadyWarned[prefix] || !isLocal()) {
    return;
  }
  const actionKey = getActionKeyFromPayload(statePayload.payload);
  const type = actionKey ? 'storeActionKey' : 'payload';
  const suggestion = actionKey ? 'a shorter' : 'an';
  console.warn(
    `Your ${type} for your action ${prefix} is very large (${payloadStr.length}) and will have negative performance consequences -- please consider adding ${suggestion} actionKey to your payload.`
  );
  globals.value.alreadyWarned[prefix] = 1;
}

function getKeyPrefix<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  return `${statePayload.store.descriptor.name}/${statePayload.actionName}#`;
}

function getPayloadString<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>, prefix?: string): string {
  prefix = prefix ?? getKeyPrefix(statePayload);
  const str = getActionKeyFromPayload(statePayload.payload) ?? JSON.stringify(statePayload.payload ?? '');
  maybeWarnPayload(prefix, str, statePayload);
  return str;
}

function payloadToKey<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>, prefix?: string) {
  prefix = prefix ?? getKeyPrefix(statePayload);
  const payloadStr = getPayloadString(statePayload, prefix);
  const hash = payloadStr.length > 512 ? md5(payloadStr) : payloadStr;
  return `${prefix}${hash}`;
}

function getActionKey<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A> | string): string {
  if (typeof statePayload === 'string') {
    return statePayload;
  }
  if (statePayload.key) {
    return statePayload.key;
  }
  const prefix = getKeyPrefix(statePayload);
  if (!statePayload.payload) {
    return prefix;
  }
  return payloadToKey(statePayload, prefix);
}

function createActionState<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>, key?: string) {
  key = key ?? getActionKey(statePayload);
  if (getActionState(key)) {
    console.warn(`Trying to re-create an action state for an action that is already there (${key})`);
    return;
  }
  const actionState: ActionState = {
    count: 0,
    errorCount: -1,
    status: ActionStatus.New,
  };
  globals.value.state[key] = actionState;
  return globals.value.state[key];
}

function getActionState<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A> | string) {
  return globals.value.state[getActionKey(statePayload)];
}

function incrementCount(key: string) {
  getActionState(key).count++;
}

function setLastError(key: string, error: Error) {
  getActionState(key).lastError = error;
}

function setErrorCount(key: string) {
  const state = getActionState(key);
  state.errorCount = state.count;
}

function setActionStatus(key: string, status: ActionStatus) {
  getActionState(key).status = status;
}

function isLoading<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  const actionState = getActionState(statePayload);
  return actionState?.status === ActionStatus.Loading;
}

function isBusy<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  const actionState = getActionState(statePayload);
  return actionState?.status === ActionStatus.Busy || isLoading(statePayload);
}

function setBusy<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  const key = getActionKey(statePayload);
  let state = getActionState(key);
  if (!state) {
    state = createActionState(statePayload, key) as ActionState;
  }
  const status = state.status === ActionStatus.New ? ActionStatus.Loading : ActionStatus.Busy;
  setActionStatus(key, status);
  incrementCount(key);
}

function getError<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  const actionState = getActionState(statePayload);
  if (!actionState || actionState.count !== actionState.errorCount) {
    return;
  }
  return actionState.lastError;
}

function setError<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A> | string, error: Error) {
  const key = getActionKey(statePayload);
  setActionStatus(key, ActionStatus.Error);
  setErrorCount(key);
  setLastError(key, error);
}

function isIdle<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  const actionState = getActionState(statePayload);
  return actionState?.status === ActionStatus.Idle;
}

function setIdle<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A> | string) {
  const key = getActionKey(statePayload);
  setActionStatus(key, ActionStatus.Idle);
}

function setCurrentExecutingActionId(id: number) {
  globals.value.currentExecutingActionId = id;
}

function unsetCurrentExectutingActionId(id: number) {
  globals.value.currentExecutingActionId = 0;
}

function setExecutingAction<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>) {
  if (!globals.value.currentExecutingActionId) {
    setCurrentExecutingActionId(++globals.value.ct);
  }
  if (!statePayload.executingActionId) {
    statePayload.executingActionId = globals.value.currentExecutingActionId;
  }
  if (!statePayload.key) {
    statePayload.key = getActionKey(statePayload);
  }
  if (!globals.value.executingActions[statePayload.executingActionId]) {
    globals.value.executingActions[statePayload.executingActionId] = [];
  }
  if (!globals.value.actionKeyToExecutingActionId[statePayload.key]) {
    globals.value.actionKeyToExecutingActionId[statePayload.key] = {};
  }
  globals.value.actionKeyToExecutingActionId[statePayload.key][statePayload.executingActionId] = 1;
  globals.value.executingActions[statePayload.executingActionId].push(statePayload.key);
}

function unsetExecutingAction<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>, executingActionId: number) {
  const actionKeys = globals.value.executingActions[executingActionId] ?? [];
  const key = statePayload.key as string;
  const idx = actionKeys.indexOf(key);
  if (idx > -1) {
    actionKeys.splice(idx, 1);
  }
  if (!actionKeys.length) {
    delete globals.value.executingActions[executingActionId];
  }
  delete globals.value.actionKeyToExecutingActionId[key]?.[executingActionId];
  if (isEmpty(globals.value.actionKeyToExecutingActionId[key])) {
    delete globals.value.actionKeyToExecutingActionId[key];
  }
}

function setErrorsForStatePayload<P, C, G, A>(statePayload: ActionStatePayload<P, C, G, A>, err: Error) {
  const actionKey = statePayload.key as string;
  const actionIdsToWalk = { ...(globals.value.actionKeyToExecutingActionId[actionKey] ?? {}) };

  const executingActionIds = Object.keys(actionIdsToWalk);
  const setKeys: { [key: string]: 1 } = {};
  // So we want to do a DFS style thing to bubble the errors up.
  while (executingActionIds.length) {
    const actionId = executingActionIds.pop();
    if (actionId && !setKeys[actionId]) {
      setKeys[actionId] = 1;
      const keys = globals.value.executingActions[actionId] ?? [];
      for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i];
        if (!setKeys[key]) {
          setKeys[key] = 1;
          const actionIds = Object.keys(globals.value.actionKeyToExecutingActionId[key] ?? {});
          // Add any new actionIds if we need to.
          for (let j = 0; j < actionIds.length; j++) {
            if (!actionIdsToWalk[actionIds[i]]) {
              actionIdsToWalk[actionIds[i]] = 1;
              executingActionIds.push(actionIds[i]);
            }
          }
          setError(key, err);
        }
      }
    }
  }
}

function wrapAction<P, C, G, A, U>(
  rootItem: StoreRootItem<P, C, G, A>,
  root: ModuleRoot,
  actionName: string,
  actionFn: (...args: any) => Promise<U>
) {
  async function wrappedAction(
    actionStatePayload: ActionStatePayload<P, C, G, A>
  ): Promise<Awaited<ReturnType<typeof actionFn>> | undefined> {
    return await new Promise((resolve, reject) => {
      const executingActionId = actionStatePayload.executingActionId as number;
      setCurrentExecutingActionId(executingActionId);
      actionFn
        .apply(actionStatePayload.store.module, actionStatePayload.payload)
        .then((result) => {
          setCurrentExecutingActionId(executingActionId);
          setIdle(actionStatePayload);
          // Maybe this needs a try catch?
          resolve(result);
        })
        .catch((err) => {
          setCurrentExecutingActionId(executingActionId);
          setErrorsForStatePayload(actionStatePayload, err);
          isLocal() && console.warn(err);
          reject(err);
        })
        .finally(() => {
          unsetCurrentExectutingActionId(executingActionId);
        });
      unsetCurrentExectutingActionId(executingActionId);
    });
  }

  return async function (...args: any) {
    return await new Promise((resolve, reject) => {
      const statePayload: ActionStatePayload<P, C, G, A> = { store: rootItem, actionName, payload: args ?? [] };
      // Get the key so it doesn't need to be recalculated.
      setExecutingAction(statePayload);
      const executingActionId = statePayload.executingActionId as number;
      debouncer
        .execute(async () => {
          setBusy(statePayload);
          return await wrappedAction(statePayload);
        }, statePayload.key)
        .then((result) => {
          setCurrentExecutingActionId(executingActionId);
          resolve(result);
        })
        .catch((err) => {
          setCurrentExecutingActionId(executingActionId);
          // Do not reject here so actions don't barf.
          resolve(err);
        })
        .finally(() => {
          unsetCurrentExectutingActionId(executingActionId);
          unsetExecutingAction(statePayload, executingActionId);
        });
      unsetCurrentExectutingActionId(executingActionId);
    });
  };
}

const firstCharReg = /^./;
const getterMethods = ['error', 'isBusy', 'isIdle', 'isLoading', 'actionKey'];
const upperGetterMethods = getterMethods.map((methodName) => methodName.replace(firstCharReg, (m) => m.toUpperCase()));
function registerActionStateGetters<P, C, G, A>(name: JsonKey, rootItem: StoreRootItem<P, C, G, A>, root: ModuleRoot) {
  const actionName = name.toString();
  upperGetterMethods.forEach((upper) => {
    const key = `${actionName}${upper}`;
    if (rootItem.getters[key]) {
      throw new Error(
        `Can't set action getter for action ${actionName} on module ${rootItem.descriptor.name}. Please rename your getter for ${key}`
      );
    }
    function actionGetter(...args: any[]) {
      const statePayload: ActionStatePayload<P, C, G, A> = { store: rootItem, actionName, payload: args ?? [] };
      switch (upper) {
        case 'Error':
          return getError(statePayload);
        case 'IsBusy':
          return isBusy(statePayload);
        case 'IsIdle':
          return isIdle(statePayload);
        case 'IsLoading':
          return isLoading(statePayload);
        case 'ActionKey':
          return getActionKey(statePayload);
        default: {
          break;
        }
      }
    }
    registerGetter(rootItem, root, key, () => actionGetter);
  });
}

export function createActions<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>, root: ModuleRoot) {
  const actions = rootItem.descriptor.actions;
  if (!actions) {
    return;
  }
  Object.entries(actions).forEach(([key, action]) => {
    Object.defineProperty(rootItem.actions, key, { ...defaultProp, value: wrapAction(rootItem, root, key, action) });
    registerActionStateGetters(key, rootItem, root);
  });
}

export function getActions<P, C, G, A>(rootItem: StoreRootItem<P, C, G, A>) {
  return rootItem.actions;
}
