import { ModuleApiState } from './types';

export const name = 'api';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleApiState {
  return {
    results: {},
  };
}
