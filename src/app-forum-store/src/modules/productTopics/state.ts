import { ModuleProductTopicsState } from './types';

export const name = 'productTopics';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleProductTopicsState {
  return {
    example: 1,
  };
}
