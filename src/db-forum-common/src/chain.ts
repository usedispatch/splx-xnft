import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { Connection as SolanaConnection } from '@solana/web3.js';
import { getProviderEndpoint } from './provider';

// TODO(viksit): pick this from env, most likely since this is secret
const SOLANA_LOCALNET = 'localnet';

// Parse env var to get back a chainId enum we can use subsequently
export function getChainIdFromEnv(envChainId: string): ChainId {
  const str = String(envChainId);
  return ChainId[str];
}

// Get the canonical name for a given chain
export function getNameForChain(chainId: ChainId) {
  if (chainId === ChainId.SolanaDev) {
    return 'devnet';
  } else if (chainId === ChainId.SolanaMain) {
    return 'mainnet-beta';
  } else if (chainId === ChainId.SolanaLocal) {
    return SOLANA_LOCALNET;
  } else {
    throw new Error(`Invalid chainId ${chainId}`);
  }
}

export function getEndpointForChain(chainId: ChainId) {
  const endpoint = getProviderEndpoint(chainId);
  if (!endpoint) {
    throw new Error(`Invalid chainId ${chainId}`);
  }
  return endpoint;
}

// TODO: add error handling for these functions
// TODO: add caching for connection object for reuse
export function getSolanaConnectionForChain(chainId: ChainId) {
  return new SolanaConnection(getEndpointForChain(chainId));
}
