import { ChainId, Transaction } from './types';

import { BufferJson } from '../actions';
import { Transaction as SolanaTx } from '@solana/web3.js';

function _solanaTxnToJson(txn: SolanaTx) {
  return txn.serialize({ requireAllSignatures: false, verifySignatures: false }).toJSON();
}

function _JsonToSolanaTxn(bufferJSON: BufferJson) {
  const txn = SolanaTx.from(bufferJSON.data);
  return txn;
}

export function transactionToJson<C extends ChainId>(txn: Transaction<C>, chainId: C) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain:
      return _solanaTxnToJson(txn);
    default:
      throw new Error(`@dispatch-services/db-forum-common/chains/transaction#transactionToString: ${chainId}`);
  }
}

export function JsonToTransaction<C extends ChainId>(str: BufferJson, chainId: C): Transaction<C> {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain:
      return _JsonToSolanaTxn(str) as Transaction<typeof chainId>;
    default:
      throw new Error(`@dispatch-services/db-forum-common/chains/transaction#stringToTransaction: ${chainId}`);
  }
}
