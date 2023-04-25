import { ChainId } from './chains';
import { getEnv } from '@dispatch-services/utils-common/env';
import { register } from '@dispatch-services/utils-common/singleton';
import { retry } from '@dispatch-services/utils-common/timers';

const prefixKey = '@dispatch-services/db-forum-common/provider#';

export interface ProviderEndpoints {
  name: string;
  endpoints: {
    [chainId: number]: string;
  };
}

function getDefaultProviders(): ProviderEndpoints[] {
  // Make it a function so .env has time to load first.
  return [
    {
      name: 'helius',
      endpoints: {
        [ChainId.SolanaLocal]: (getEnv('SOLANA_ENDPOINT') || process.env.SOLANA_ENDPOINT) as string,
        [ChainId.SolanaDev]: `https://rpc-devnet.helius.xyz?api-key=${
          (getEnv('HELIUS_SOLANADEV') || process.env.HELIUS_SOLANADEV) as string
        }`,
        [ChainId.SolanaMain]: `https://rpc.helius.xyz?api-key=${
          (getEnv('HELIUS_SOLANAMAIN') || process.env.HELIUS_SOLANAMAIN) as string
        }`,
      },
    },
    {
      name: 'alchemy',
      endpoints: {
        [ChainId.SolanaLocal]: (getEnv('SOLANA_ENDPOINT') || process.env.SOLANA_ENDPOINT) as string,
        [ChainId.SolanaDev]: `https://solana-devnet.g.alchemy.com/v2/${
          (getEnv('ALCHEMY_SOLANADEV') || process.env.ALCHEMY_SOLANADEV) as string
        }`,
        [ChainId.SolanaMain]: `https://solana-mainnet.g.alchemy.com/v2/${
          (getEnv('ALCHEMY_SOLANAMAIN') || process.env.ALCHEMY_SOLANAMAIN) as string
        }`,
      },
    },
  ];
}

const globals = register(() => {
  const providers: ProviderEndpoints[] = [];
  return { providers };
}, `${prefixKey}globals`);

function getProvider(ct: number, chainId: ChainId): ProviderEndpoints | undefined {
  if (!globals.providers.length) {
    globals.providers = getDefaultProviders();
  }
  let found = 0;
  let idx = 0;
  while (found <= ct) {
    if (globals.providers[idx].endpoints[chainId]) {
      if (found === ct) {
        return globals.providers[idx];
      }
      found++;
    }
    idx++;
    if (idx >= globals.providers.length) {
      if (idx === globals.providers.length && !found) throw new Error('noProviderForChain');
      idx = 0;
    }
  }
}

export function getProviderEndpoint(chainId: ChainId, ct: number = 0) {
  return getProvider(ct, chainId)?.endpoints[chainId];
}

export async function retryProvider<T>(
  fn: (endpoint: string) => Promise<T>,
  chainId: ChainId
): Promise<Awaited<ReturnType<typeof fn>>> {
  return await retry(async (retry) => {
    const provider = getProvider(retry, chainId);
    if (!provider) {
      throw new Error('noProviderFound');
    }
    const startTime = Date.now();
    try {
      return await fn(provider.endpoints[chainId]);
    } catch (err) {
      console.log('RPC error for endpoint', provider.endpoints[chainId]);
      throw err;
    } finally {
      const latency = Date.now() - startTime;
      if (latency > 1000) {
        console.log('RPC time for endopint', provider.endpoints[chainId], latency);
      }
    }
  });
}
