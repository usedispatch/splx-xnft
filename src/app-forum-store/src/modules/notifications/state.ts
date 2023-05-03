import { ModuleNotificationsState } from './types';

export const name = 'notifications';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleNotificationsState {
  return {
    markingReadId: '',
  };
}
