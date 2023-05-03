import { ModuleLocalStateState } from './types';

export const name = 'localState';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleLocalStateState {
  return {
    latestTime: { block: {}, time: 0, txn: {} },
    locallyCreatedParams: {},
    locallyEditedParams: {},
    pendingTime: { block: {}, ct: 0, time: 0, txn: {} },
    pending: {},
  };
}
