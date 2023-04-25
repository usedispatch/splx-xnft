import { ChainId, chainIdBits } from './chains';
import { IdDelim, getBlockOrderPrefixFromId } from './entities';
import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

// `${utcSecondsFromUnixEpoch}${chainId}${block}${tx}`
// `${u40}${u16}${u48}${u16}`

export interface ParsedBlockOrder {
  timestamp: number; // Seconds past 1970 (Unix)
  chainId: ChainId;
  block: number;
  txn: number;
  packed: string;
  prefix?: string;
  blockOrder: string;
}

export const timestampBits = 48; // Should give us a few thousand years.
export const blockBits = 48; // Even though slots are 64, we need the space for keys.
export const txnBits = 16; // Max txns/block = 64k
const epochDenom = 2;

export const maxBlock = Math.pow(2, blockBits) - 1;
export const maxTxn = Math.pow(2, txnBits) - 1;

const blockOrderBits = [timestampBits, chainIdBits, blockBits, txnBits];
// const blockOrderLength = blockOrderBits.reduce((acc, bits) => acc + bits, 0) / 4;

export function packBlockTxn(
  timestamp: number,
  chainId: ChainId,
  block: number,
  txn: number,
  epochBlockOrder?: ParsedBlockOrder | string
) {
  const parsedEpoch =
    typeof epochBlockOrder === 'string'
      ? parseBlockOrder(epochBlockOrder)
      : epochBlockOrder ?? { timestamp: 0, block: 0 };
  let timestampDenom = 1;
  let blockDenom = 1;
  if (parsedEpoch.timestamp > 0) {
    timestamp -= parsedEpoch.timestamp;
    timestamp = Math.max(timestamp, 0);
    timestampDenom = epochDenom;
  }
  if (parsedEpoch.block > 0) {
    block -= parsedEpoch.block;
    block = Math.max(block, 0);
    blockDenom = epochDenom;
  }

  const blockOrder = [
    numToHex(timestamp, timestampBits / timestampDenom, true),
    numToHex(chainId, chainIdBits),
    numToHex(block, blockBits / blockDenom, true),
    numToHex(txn, txnBits, true),
  ].join('');
  return blockOrder;
}

export function packBlockOrder(id: string, packedBlockTxn: string) {
  const prefix = getBlockOrderPrefixFromId(id);
  return `${prefix}${IdDelim.Link}${packedBlockTxn}`;
}

export function parseBlockOrder(
  blockOrder: string,
  parsedEpoch: { block: number; timestamp: number } = { block: 0, timestamp: 0 }
): ParsedBlockOrder {
  const [prefix, blockOrderString] = blockOrder.split(IdDelim.Link);
  if (blockOrderString) {
    blockOrder = blockOrderString;
  }
  let cumBits = 0;
  const numbers = blockOrderBits.reduce<number[]>((acc, bits, idx) => {
    const epoch =
      idx === 0 && parsedEpoch.timestamp
        ? parsedEpoch.timestamp
        : idx === 2 && parsedEpoch.block
        ? parsedEpoch.block
        : 0;
    const denom = epoch ? 2 : 1;
    const hex = blockOrder.slice(cumBits / 4, (cumBits + bits / denom) / 4);
    acc.push(hexToNum(hex, idx !== 1) + epoch);
    cumBits += bits / denom;
    return acc;
  }, []);
  return {
    timestamp: numbers[0],
    chainId: numbers[1],
    block: numbers[2],
    txn: numbers[3],
    packed: blockOrderString || blockOrder,
    prefix: blockOrderString ? prefix : '',
    blockOrder: packBlockTxn(numbers[0], numbers[1], numbers[2], numbers[3]),
  };
}
