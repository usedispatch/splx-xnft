import { Commitment as SolanaCommitment, Connection as SolanaConnection } from '@solana/web3.js';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions';
import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ModuleApi } from '@dispatch-services/store/vuestand';
import { SolanaWalletInterface } from '@dispatch-services/db-forum-common/wallet';

export type ThisBlockchain = ModuleApi<
  ModuleBlockchainState,
  ModuleBlockchainComputed,
  ModuleBlockchainGetters,
  ModuleBlockchainActions
>;

/**
 *
 * Blockchain related storage should be indexed by chainId.
 * chainId should be used by db-forum-common.utils.chain to fetch
 * an endpoint, and a connection.
 *
 **/

export interface ModuleBlockchainState {
  wallet: SolanaWalletInterface | undefined;
  chainId: ChainId;
  commitment: SolanaCommitment | undefined;
  connected: boolean;
}

export interface ModuleBlockchainComputed {
  useConnection: () => SolanaConnection;
  isWalletConnected: () => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleBlockchainGetters {}

export interface ModuleBlockchainActions {
  setChainState: (
    wallet: SolanaWalletInterface,
    chainId: ChainId,
    commitment: SolanaCommitment,
    connected: boolean
  ) => Promise<void>;
  disconnect: () => Promise<void>;
  sendActionToChain: (actionInput: ActionEntityJson) => Promise<void>;
}
