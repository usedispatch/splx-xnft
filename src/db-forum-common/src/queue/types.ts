import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

export enum QueueType {
  Unknown = 0,
  ChatGptProductFeedback = 10,
}

export enum QueueStatus {
  Unknown = 0,
  Queued = 10,
  Error = 20,
  Executing = 30,
  Done = 40,
}

export function hexToQueueType(hex: string): QueueType {
  const num = hexToNum(hex) ?? QueueType.Unknown;
  return Number.isNaN(num) ? QueueType.Unknown : num;
}

export function queueTypeToHex(type: QueueType): string {
  return numToHex(type, 16) ?? QueueType[QueueType.Unknown];
}
