import * as Solana from '@solana/web3.js';

import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisUser = ModuleApi<ModuleUserState, ModuleUserComputed, ModuleUserGetters, ModuleUserActions>;
type This = ThisUser;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleUserState {}

export interface ModuleUserComputed {
  profileId: () => string;
  userId: () => string;
  walletId: () => string;
}

// TODO(partyman): refactor for simplicity
export interface ModuleUserGetters {
  noOpForLint: () => () => void;
}

export interface ModuleUserActions {
  setOrCreateUser: (this: This, wallet: Solana.PublicKey) => Promise<void>;
  logout: (this: This) => Promise<void>;
}
