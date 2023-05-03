import { ModuleWalletState } from './types';

export const name = 'wallet';
// To keep state clean, return a state object from a function.
export function getInitialState(): ModuleWalletState {
  return {
    canceledWaitingToConnectWallet: false,
    did: '',
    proxyKey: { key: undefined, expires: 0, uuid: undefined },
    waitingToConnectWallet: false,
    walletId: '',
  };
}
