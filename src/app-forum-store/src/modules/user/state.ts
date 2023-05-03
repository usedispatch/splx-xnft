import { ModuleUserState } from './types';

export const name = 'user';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleUserState {
  return {};
}
