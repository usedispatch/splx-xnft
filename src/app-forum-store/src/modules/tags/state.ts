import { ModuleTagsState } from './types';

export const name = 'tags';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleTagsState {
  return {
    example: 1,
  };
}
