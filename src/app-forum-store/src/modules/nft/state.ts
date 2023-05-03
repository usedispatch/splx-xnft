import { ModuleNftState } from './types';

export const name = 'nft';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleNftState {
  return {
    nftMint: undefined,
  };
}
