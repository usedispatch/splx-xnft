import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisNft = ModuleApi<ModuleNftState, ModuleNftComputed, ModuleNftGetters, ModuleNftActions>;
type This = ThisNft;

export interface ModuleNftState {
  nftMint: string | undefined;
}

export interface ModuleNftComputed {
  hasClaimed: () => () => boolean;
}

export interface ModuleNftGetters {
  getClaimAction: () => () => number;
  getNftMintAddressConfig: () => (walletAddress: string) => ApiRequestConfig;
  getClaimTransactionConfig: () => (walletAddress: string, mintAddress: string) => ApiRequestConfig;
}

export interface ModuleNftActions {
  checkClaim: (this: This) => Promise<void>;
  claim: (this: This) => Promise<void>;
}
