import { ModuleUserProfileState } from './types';

export const name = 'userProfile';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleUserProfileState {
  return {
    pendingPreferWalletPopups: undefined,
  };
}
