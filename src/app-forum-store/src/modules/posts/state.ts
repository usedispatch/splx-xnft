import { ModulePostsState } from './types';

export const name = 'posts';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModulePostsState {
  return {
    example: 1,
  };
}
