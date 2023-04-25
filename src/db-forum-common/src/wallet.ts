import {
  MessageSignerWalletAdapterProps,
  SignerWalletAdapterProps,
  WalletAdapterProps,
} from '@solana/wallet-adapter-base';
import { decode as bs58Decode, encode as bs58Encode } from 'bs58';

import { ChainId } from './chains';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';

// TODO(zfaizal2): p1 post migration.
// this needs to be a typed wallet interface
// we shouldn't be creating our own interface here.
// TODO: Remove hack.
export interface SolanaWalletInterface {
  connected: boolean;
  publicKey: SolanaPublicKey;
  sendTransaction: WalletAdapterProps['sendTransaction'];
  signTransaction: SignerWalletAdapterProps['signTransaction'];
  signAllTransactions: SignerWalletAdapterProps['signAllTransactions'];
  signMessage: MessageSignerWalletAdapterProps['signMessage'];
}

interface SolanaSignMessage {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export async function signMessage(walletInterface: any, message: string, chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      const signature = await (walletInterface as SolanaSignMessage).signMessage(new TextEncoder().encode(message));
      return signatureToString(signature, chainId);
    }
    default: {
      return '';
    }
  }
}

export function signatureToString(signature: Uint8Array, chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      return bs58Encode(signature);
    }
    default: {
      return '';
    }
  }
}

export function stringToSignature(signature: string, chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      return bs58Decode(signature);
    }
    default: {
      return new Uint8Array();
    }
  }
}

export function truncateAddress(address: string, digits: number = 6) {
  return `${address.slice(0, digits)}...${address.slice(-1 * digits)}`;
}
