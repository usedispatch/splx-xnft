import { Transaction as SolanaTx, TransactionResponse as SolanaTxnResponse } from '@solana/web3.js';
import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

export const chainIdBits = 16;

// Register new chains here. Add each to chainIds const as well.
export enum ChainId {
  Unknown = 0,
  SolanaLocal = 10,
  SolanaDev = 20,
  SolanaMain = 30,
}
export type SolanaChain = ChainId.SolanaLocal | ChainId.SolanaDev | ChainId.SolanaMain;

export type Transaction<C extends ChainId> = C extends SolanaChain ? SolanaTx : never;
export type TransactionResponse<C extends ChainId> = C extends SolanaChain ? SolanaTxnResponse : never;

export const chainIds: ChainId[] = [ChainId.SolanaLocal, ChainId.SolanaDev, ChainId.SolanaMain];

export function chainIdToName(chainId: ChainId) {
  return ChainId[chainId];
}

export function hexToChainId(hex: string): ChainId {
  return hexToNum(hex) ?? ChainId.Unknown;
}

export function chainIdToHex(chainId: ChainId): string {
  return numToHex(chainId, chainIdBits) ?? ChainId[ChainId.Unknown];
}

export function hexToChainName(hex: string) {
  const chainId = hexToChainId(hex);
  return chainIdToName(chainId);
}
