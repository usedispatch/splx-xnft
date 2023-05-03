import * as Solana from '@solana/web3.js';

import { ModuleBlockchainComputed, ThisBlockchain as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';
import { getEndpointForChain } from '@dispatch-services/db-forum-common/chain';

const useConnection: ModuleComputed<This> = function () {
  const chainId = this.state.chainId;
  const commitment = this.state.commitment;
  // All information about a given chain is retrieved via chain tools.
  const endpoint = getEndpointForChain(chainId);
  const solanaConnection = new Solana.Connection(endpoint, commitment);
  return solanaConnection;
};

const isWalletConnected: ModuleComputed<This> = function () {
  return this.state.connected;
};

export const computed: ModuleBlockchainComputed = {
  useConnection,
  isWalletConnected,
};
