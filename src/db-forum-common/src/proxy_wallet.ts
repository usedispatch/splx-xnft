import { ActionRpc, Crud } from './actions';
import {
  Connection as SolanaConnection,
  Keypair as SolanaKeypair,
  PublicKey as SolanaPublicKey,
  sendAndConfirmRawTransaction as SolanaSendRawTx,
  Transaction as SolanaTx,
  TransactionConfirmationStrategy,
} from '@solana/web3.js';
import { decode as bs58Decode, encode as bs58Encode } from 'bs58';
import { decrypt, encrypt } from '@dispatch-services/utils-common/crypto';

import { ChainId } from './chains';
import { EntityType } from './entities';
import { sign as SolanaSign } from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import { getEnv } from '@dispatch-services/utils-common/env';
import { register } from '@dispatch-services/utils-common/singleton';
import { retryProvider } from './provider';

const keyPrefix = '@dispatch-services/db-forum-common/proxy_wallet#';

interface BlockCache {
  blockhash: string;
  lastValidBlockHeight: number;
  time: number;
}

const { serverKeys, blockCache } = register(() => {
  const serverKeys: { [chainId: number]: string[] } = {};
  const blockCache: { [chainId: number]: BlockCache } = {};
  return {
    blockCache,
    serverKeys,
  };
}, `${keyPrefix}globals`);

export function canUseProxyWallet() {
  return !globalThis.noProxyWallet;
}

export function getServerKeys(chainId: ChainId): string[] {
  if (!serverKeys[chainId]) {
    switch (chainId) {
      case ChainId.SolanaDev:
      case ChainId.SolanaLocal:
      case ChainId.SolanaMain: {
        serverKeys[chainId] = generateKeyPairFromSecret(getEnv('SOLANA_PRIVATE_KEY'), chainId);
        break;
      }
      default: {
        break;
      }
    }
  }
  return serverKeys[chainId];
}

export function getServerPublicKey(chainId: ChainId) {
  return getServerKeys(chainId)[0];
}

export function getServerPrivateKey(chainId: ChainId) {
  return getServerKeys(chainId)[1];
}

export function createKeyPair(chainId: ChainId, actionId: string): string[] {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      const { publicKey, secretKey } = SolanaKeypair.generate();
      const privateKey = encrypt(bs58Encode(secretKey), getServerPrivateKey(chainId), actionId);
      return [publicKey.toBase58(), privateKey];
    }
    default: {
      return [];
    }
  }
}

export function generateKeyPairFromSecret(secret: string, chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      const { publicKey, secretKey } = SolanaKeypair.fromSecretKey(bs58Decode(secret));
      return [publicKey.toBase58(), bs58Encode(secretKey)];
    }
    default: {
      return [];
    }
  }
}

export function decryptProxyKey(chainId: ChainId, actionId: string, encryptedKeyHex: string) {
  const decrypted = decrypt(encryptedKeyHex, getServerPrivateKey(chainId), actionId);
  return generateKeyPairFromSecret(decrypted, chainId)[1];
}

export function signMessage(chainId: ChainId, message: string, privateKey: string) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      const messageBytes = decodeUTF8(message);
      const signature = SolanaSign.detached(messageBytes, bs58Decode(privateKey));
      return bs58Encode(signature);
    }
    default: {
      return '';
    }
  }
}

export function signActionRpc<E extends EntityType, C extends Crud>(rpc: ActionRpc<E, C>, privateKey: string) {
  const { chainId } = rpc;
  const message = JSON.stringify(rpc);
  return signMessage(chainId, message, privateKey);
}

export function verifyMessage(
  chainId: ChainId,
  message: string | Uint8Array,
  publicKey: string,
  signature: string | Uint8Array
) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      const messageBytes = typeof message === 'string' ? decodeUTF8(message) : message;
      const signatureBytes = typeof signature === 'string' ? bs58Decode(signature) : signature;
      return SolanaSign.detached.verify(messageBytes, signatureBytes, new SolanaPublicKey(publicKey).toBytes());
    }
    default: {
      return false;
    }
  }
}

export function verifyActionRpc<E extends EntityType, C extends Crud>(
  rpcOrMessage: ActionRpc<E, C> | string,
  publicKey: string,
  signature: string | Uint8Array
) {
  const rpc = typeof rpcOrMessage === 'string' ? JSON.parse(rpcOrMessage) : rpcOrMessage;
  const { chainId } = rpc;
  const message = typeof rpcOrMessage === 'string' ? rpcOrMessage : JSON.stringify(rpcOrMessage);
  return verifyMessage(chainId, message, publicKey, signature);
}

export async function sendActionTransaction(tx: any, chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      return await retryProvider(async (endpoint) => {
        const connection = new SolanaConnection(endpoint, 'confirmed');
        const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(chainId);
        const strategy: TransactionConfirmationStrategy = {
          blockhash,
          lastValidBlockHeight,
          signature: bs58Encode((tx as SolanaTx).signature as Buffer),
        };
        return await SolanaSendRawTx(connection, (tx as SolanaTx).serialize(), strategy, { skipPreflight: false });
      }, chainId);
    }
    default: {
      break;
    }
  }
}

export function isServerWallet(address: string, chainId: ChainId) {
  return address === getServerPublicKey(chainId);
}

export function getInitialFunding(chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      return 0.001;
    }
    default: {
      return 0;
    }
  }
}

export function getActionCost(chainId: ChainId) {
  switch (chainId) {
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal:
    case ChainId.SolanaMain: {
      return 10 * 1e3;
    }
    default: {
      return 0;
    }
  }
}

async function _getLatestBlockhashFromProvider(chainId: ChainId): Promise<BlockCache> {
  const time = Date.now();
  const { blockhash, lastValidBlockHeight } = await retryProvider(async (endpoint) => {
    return await new SolanaConnection(endpoint).getLatestBlockhash('finalized');
  }, chainId);
  return {
    blockhash,
    lastValidBlockHeight,
    time,
  };
}

function _shouldGetLatestBlockhash(chainId: ChainId) {
  return !canUseProxyWallet() || Date.now() - (blockCache[chainId]?.time ?? 0) > 10 * 1000;
}

export async function getLatestBlockhash(chainId: ChainId) {
  if (_shouldGetLatestBlockhash(chainId)) {
    try {
      const cache = await _getLatestBlockhashFromProvider(chainId);
      if (cache) blockCache[chainId] = cache;
    } catch (err) {
      console.log('Error updating lateset blockhash');
    }
  }
  if (!blockCache[chainId]) {
    throw new Error('noLatestBlockhash');
  }
  const { blockhash, lastValidBlockHeight } = blockCache[chainId];
  return { blockhash, lastValidBlockHeight };
}

export function redactUuid(uuid?: string) {
  return uuid ? `${uuid.slice(0, 3)}...[${uuid.length - 6}]...${uuid.slice(-3)}` : 'no uuid';
}
