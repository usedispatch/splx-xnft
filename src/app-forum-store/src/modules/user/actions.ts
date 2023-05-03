import * as Solana from '@solana/web3.js';

import { ModuleAction, useLocalStorage } from '@dispatch-services/store';
import { ModuleUserActions, ThisUser as This } from './types';

import { getRealm } from '@dispatch-services/utils-common/env';
import { useWallet } from '../wallet';

const setOrCreateUser: ModuleAction<This> = async function (wallet: Solana.PublicKey) {
  const walletId = wallet.toBase58();
  await useWallet.actions.unsetProxyKey();
  await useWallet.actions.setWalletAddress(walletId);
  await useLocalStorage.actions.setNamespace(`${walletId}-${getRealm() as string}`);
  await this.root.userProfile.actions.getUserProfile(walletId);
};

const logout: ModuleAction<This> = async function logout(this: This) {
  await useLocalStorage.actions.clearAll();
  await useWallet.actions.unsetWalletAddress();
};

export const actions: ModuleUserActions = {
  setOrCreateUser,
  logout,
};
