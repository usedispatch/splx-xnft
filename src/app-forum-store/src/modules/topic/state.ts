import { ModuleTopicsState } from './types';

export const name = 'topic';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleTopicsState {
  return {
    example: 1,
  };
}
