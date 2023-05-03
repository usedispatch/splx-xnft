import { ModuleVotesState } from './types';

export const name = 'votes';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleVotesState {
  return {
    example: 1,
  };
}
