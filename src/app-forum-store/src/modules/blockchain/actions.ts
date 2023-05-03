import * as Solana from '@solana/web3.js';

import { ChainId, JsonToTransaction } from '@dispatch-services/db-forum-common/chains';
import { ModuleBlockchainActions, ThisBlockchain as This } from './types';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions';
import { ModuleAction } from '@dispatch-services/store';
import { SolanaWalletInterface } from '@dispatch-services/db-forum-common/wallet';
import { getInitialState } from './state';

const setChainState: ModuleAction<This> = async function (
  wallet: SolanaWalletInterface,
  chainId: ChainId,
  commitment: Solana.Commitment,
  connected: boolean
) {
  this.setState((state) => {
    state.wallet = wallet;
    state.chainId = chainId;
    state.commitment = commitment;
    state.connected = connected;
  });
};

const disconnect: ModuleAction<This> = async function () {
  this.setState((state) => {
    const { wallet, chainId, commitment, connected } = getInitialState();
    state.wallet = wallet;
    state.chainId = chainId;
    state.commitment = commitment;
    state.connected = connected;
  });
};

const sendActionToChain: ModuleAction<This> = async function (actionInput: ActionEntityJson) {
  if (!actionInput.signedTxn || !this.state.wallet) {
    return;
  }
  const txn = JsonToTransaction(actionInput.signedTxn, this.state.chainId);
  await this.state.wallet.sendTransaction(txn, this.computed.useConnection, { skipPreflight: false });
};

export const actions: ModuleBlockchainActions = {
  setChainState,
  disconnect,
  sendActionToChain,
};
