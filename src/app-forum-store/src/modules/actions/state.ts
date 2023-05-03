import { ModuleActionsState } from './types';
import { Scheduler } from '@dispatch-services/utils-common/timers';

export const name = 'actions';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleActionsState {
  return {
    scheduledActions: new Scheduler(),
    createdActionIds: new Set(),
  };
}
