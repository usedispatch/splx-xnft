import { ModuleAppState } from './types';

export const name = 'app';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleAppState {
  return {
    example: 1,
  };
}
