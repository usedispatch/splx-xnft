import { ModuleImageState } from './types';

export const name = 'image';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleImageState {
  return {
    images: {},
  };
}
