import { ModuleSearchState } from './types';

export const name = 'search';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleSearchState {
  return {
    indexes: {},
    resultsIds: {},
  };
}
