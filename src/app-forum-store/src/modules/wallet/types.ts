import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api/types';
import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ModuleApi } from '@dispatch-services/store/vuestand';
import { SolanaWalletInterface } from '@dispatch-services/db-forum-common/wallet';

export type ThisWallet = ModuleApi<ModuleWalletState, ModuleWalletComputed, ModuleWalletGetters, ModuleWalletActions>;
type This = ThisWallet;

export interface ModuleWalletState {
  did: string;
  walletId: string;
  waitingToConnectWallet: boolean;
  canceledWaitingToConnectWallet: boolean;
  proxyKey: { key: string | undefined; expires: number; uuid: string | undefined };
}

export interface ModuleWalletComputed {
  actionsRemaining: () => number;
  chainId: () => ChainId;
  hasFunds: () => boolean;
  fundsRemaining: () => number;
  profile: () => EntityJson<EntityType.Profile> | undefined;
  proxy: () => EntityJson<EntityType.WalletProxy> | undefined;
  proxyKey: () => string;
  proxyPublicKey: () => string;
  sessionExpired: () => boolean;
  shouldDecryptProxyKey: () => boolean;
  userId: () => string;
  uuid: () => string | undefined;
  wallet: () => SolanaWalletInterface | undefined;
}

export interface ModuleWalletGetters {
  getProxyKeyConfig: () => (
    creatorId: string,
    chainId: ChainId,
    message: string,
    signature?: string,
    uuid?: string
  ) => ApiRequestConfig;
}

export interface ModuleWalletActions {
  cancelWaitForWalletConnect: (this: This) => Promise<void>;
  decryptProxyKey: () => Promise<void>;
  setProxyKey: (this: This) => Promise<void>;
  setWalletAddress: (this: This, address: string) => Promise<void>;
  startWaitForWalletConnect: (this: This) => Promise<void>;
  waitForWalletConnect: (this: This) => Promise<void>;
  unsetProxyKey: (this: This) => Promise<void>;
  unsetWalletAddress: (this: This) => Promise<void>;
}
