import { ModuleForumsState } from './types';

export const name = 'forums';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleForumsState {
  return {
    example: 1,
  };
}
