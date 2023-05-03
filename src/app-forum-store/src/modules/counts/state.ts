import { ModuleCountsState } from './types';

export const name = 'counts';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleCountsState {
  return {
    example: 1,
  };
}
