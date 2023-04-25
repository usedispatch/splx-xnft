import {
  ActionCreate,
  ActionEntityJson,
  ActionLog,
  Crud,
  Log,
  MergedActionLog,
  ProfileActionParams,
  TwitterConnectProfileActionParams,
} from './types';
import {
  EntityType,
  ParsedUserId,
  VerificationType,
  generateCountId,
  generateCountUserId,
  generateVerificationId,
  getParentIdFromId,
  getPendingTimestampFromActionId,
  isPostboxEntity,
  parseId,
} from '@dispatch-services/db-forum-common/entities';
import { createDataHash, verifyDataHash } from '@dispatch-services/utils-common/crypto';
import {
  generateIdFromLog,
  getActionIdFromOptimisticActionId,
  getActionIdsFromId,
  getTargetIdFromAction,
  isOptimisticAction,
} from './ids';
import { packBlockTxn, parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';

import { isNil } from '@dispatch-services/utils-common/function';

function byCrud<T extends ActionCreate<any, any>>(a: T, b: T) {
  if (!a || !b) return -1;
  return (a.crud ?? Crud.Unknown) - (b.crud ?? Crud.Unknown);
}

function byEntity<T extends ActionCreate<any, any>>(a: T, b: T) {
  if (!a || !b) return -1;
  return (a.type ?? EntityType.Unknown) - (b.type ?? EntityType.Unknown);
}

function byTxn<T extends ActionLog>(a: T, b: T) {
  if (!a || !b) return -1;
  return a.txn - b.txn;
}

function byBlock<T extends ActionLog>(a: T, b: T) {
  if (!a || !b) return -1;
  return a.block - b.block;
}

function byChain<T extends ActionLog>(a: T, b: T) {
  if (!a || !b) return -1;
  return a.chainId - b.chainId;
}

function byTime<T extends ActionLog>(a: T, b: T) {
  if (!a || !b) return -1;
  return a.timestamp - b.timestamp;
}

function byTimeChainBlockTxnEntityCrud<T extends ActionLog>(a: T, b: T) {
  return (
    byTime(a, b) ||
    byChain(a, b) ||
    byBlock(a, b) ||
    byTxn(a, b) ||
    byEntity(a.action, b.action) ||
    byCrud(a.action, b.action)
  );
}

export function sortLogs(logs: ActionLog[]) {
  return logs.sort(byTimeChainBlockTxnEntityCrud);
}

function mergeActionLogsForId(logs: ActionLog[]): MergedActionLog {
  // First merge them all together.
  const log = logs.reduce((acc, log) => {
    return { ...acc, ...log };
  }, {}) as ActionLog;
  const updated = packBlockTxn(log.timestamp, log.chainId, log.block, log.txn);
  // Maintain the block and txn if there's a post in there.
  if (logs[0].action.crud === Crud.Post) {
    log.timestamp = logs[0].timestamp;
    log.chainId = logs[0].chainId;
    log.block = logs[0].block;
    log.txn = logs[0].txn;
  }
  return {
    updated,
    ...log,
  };
}

function groupLogsById(logs: ActionLog[]) {
  return logs.reduce<{ [id: string]: ActionLog[] }>((acc, log) => {
    const id = generateIdFromLog(log);
    if (!acc[id]) {
      acc[id] = [];
    }
    acc[id].push(log);
    return acc;
  }, {});
}

export function mergeLogs(logs: ActionLog[]) {
  // First sort the logs.
  sortLogs(logs);
  // Now group by Id.
  const grouped = groupLogsById(logs);
  // Now merge them all together.
  const merged = Object.values(grouped).reduce<MergedActionLog[]>((acc, logs) => {
    acc.push(mergeActionLogsForId(logs));
    return acc;
  }, []);
  // Finally, resort the merged logs and return them.
  sortLogs(merged);
  return merged;
}

export function isPostboxLog(log: ActionLog) {
  return isPostboxEntity(log.action.type);
}

export function getDidFromLog(log: ActionLog) {
  let did = (log.action as ActionCreate<EntityType.User, any>).params.did;
  if (!did) {
    const parsedId = parseId(log.creatorId) as ParsedUserId;
    did = parsedId.type === EntityType.User ? parsedId.actionId : did;
  }
  return did;
}

export function getPostboxParentIdFromLog(log: ActionLog) {
  let parentId = log.action.parentId;
  if (!parentId && log.action.crudEntityId && isPostboxLog(log)) {
    // Then it's an edit. We need to get the parentId from the crudEntityId.
    parentId = getParentIdFromId(log.action.crudEntityId);
  }
  return parentId ?? '';
}

export function getCountParentIdFromLog<A extends ActionEntityJson>(log: A) {
  let parentId = log.action.parentId;
  if (
    !parentId &&
    log.action.crudEntityId &&
    (log.action.crud === Crud.Delete || log.action.type === EntityType.Vote)
  ) {
    // Then it's an edit. We only update counts for deletes or vote edits.
    parentId = getParentIdFromId(log.action.crudEntityId);
  }
  return parentId ?? '';
}

export function getCountIdFromLog<A extends ActionEntityJson>(log: A) {
  const parentId = getCountParentIdFromLog(log);
  return parentId ? generateCountId(parentId, log.chainId) : '';
}

export function getUserCountIdFromLog<A extends ActionEntityJson>(log: A) {
  const parentId = log.creatorId;
  return parentId ? generateCountUserId(parentId, log.chainId) : '';
}

export function getLogBlockOrder(log: Log) {
  const { block, chainId, timestamp, txn } = log;
  return packBlockTxn(timestamp, chainId, block, txn);
}

export function isOptimisticLog(log: MergedActionLog) {
  return isOptimisticAction(log);
}

export function getActionIdsFromLogs(logs: MergedActionLog[]) {
  const actionIds = logs.reduce<string[]>((acc, log) => {
    const targetId = log.action ? getTargetIdFromAction(log) : '';
    return (targetId ? getActionIdsFromId(targetId) : []).reduce((acc, actionId) => {
      if (actionId) {
        acc.push(getActionIdFromOptimisticActionId(actionId));
      }
      return acc;
    }, acc);
  }, []);
  return [...new Set(actionIds)];
}

export function generateLogFromActionJson(
  actionJson: ActionEntityJson,
  actionId: string,
  blockOrder: string
): MergedActionLog {
  const { id, block, chainId, pendingId, txn, time } = actionJson;
  const timestamp = time || (getPendingTimestampFromActionId(pendingId) as number);
  const updated = packBlockTxn(timestamp, chainId, block ?? 0, txn ?? 0);
  const log = {
    ...actionJson,
    actionId: id,
    block: block ?? 0,
    fee: 0,
    payment: 0,
    timestamp,
    time: timestamp,
    txn: txn ?? 0,
    updated,
  };
  if (log.parentId && log.action.parentId && log.parentId !== log.action.parentId) {
    log.parentId = log.action.parentId;
  }
  return log;
}

// Note(Partyman): Before this time, we didn't have both a secret and a TwitterUserId returned. So we'll just
// Take their word for it.
const graceDate = 1680553069;
function logIsDuringGracePeriod(log: MergedActionLog) {
  const time = parseBlockOrder(log.updated || log.blockOrder).timestamp;
  return time < graceDate;
}

function getTwitterActionParams(log: MergedActionLog) {
  const { twitter, twitterUserId, disconnect } = (log.action as ActionCreate<EntityType.Profile, any>).params;
  return { twitter: logIsDuringGracePeriod(log) ? twitter : '', twitterUserId, disconnect };
}

function isTwitterLog(log: MergedActionLog) {
  const { twitter, twitterUserId, disconnect } = getTwitterActionParams(log);
  return !isNil(twitterUserId) || !isNil(twitter) || !isNil(disconnect);
}

function getTwitterDataHashParams(
  parentId: string,
  twitter: string,
  twitterUserId: string
): TwitterConnectProfileActionParams {
  return {
    parentId,
    twitter,
    twitterUserId,
  };
}

export function createTwitterDataHash(
  parentId: string,
  twitter: string,
  twitterUserId: string,
  publicKey?: string,
  privateKey?: string
) {
  const params = getTwitterDataHashParams(parentId, twitter, twitterUserId);
  return createDataHash(params, publicKey, privateKey);
}

function getTwitterUserIdFromLog(log: MergedActionLog, useGrace: boolean = false) {
  const { twitterUserId, twitter, secret } = log.action.params as ProfileActionParams;

  let verified = false;
  if (secret) {
    verified = verifyDataHash(getTwitterDataHashParams(log.creatorId, twitter, twitterUserId), secret);
  } else if (useGrace) {
    verified = logIsDuringGracePeriod(log);
  }
  return verified ? twitterUserId ?? twitter : '';
}

export function getVerificationTypeFromLog(log: MergedActionLog) {
  if (log.action.type !== EntityType.Profile) {
    return VerificationType.Unknown;
  }
  if (isTwitterLog(log)) {
    return VerificationType.Twitter;
  }
}

export function getVerificationExternalIdFromLog(log: MergedActionLog, useGrace: boolean = false) {
  const type = getVerificationTypeFromLog(log);
  if (!type) {
    return;
  }
  switch (type) {
    case VerificationType.Twitter: {
      const { disconnect } = getTwitterActionParams(log);
      return !isNil(disconnect) ? '' : getTwitterUserIdFromLog(log, useGrace);
    }
  }
}

export function isVerificationDisconnectLog(log: MergedActionLog) {
  const type = getVerificationTypeFromLog(log);
  if (!type) {
    return false;
  }
  switch (type) {
    case VerificationType.Twitter: {
      const { disconnect } = getTwitterActionParams(log);
      return !isNil(disconnect);
    }
  }
}

export function isVerificationLog(log: MergedActionLog) {
  return !!getVerificationTypeFromLog(log);
}

export function getEntityTypeFromLog(log: MergedActionLog): EntityType {
  return log.action.type;
}

export function isVoteLog(log: MergedActionLog) {
  return getEntityTypeFromLog(log) === EntityType.Vote;
}

export function getVerificationIdFromLog(log: MergedActionLog) {
  const type = getVerificationTypeFromLog(log);
  const externalId = getVerificationExternalIdFromLog(log);
  if (!type || !externalId) {
    return;
  }
  return generateVerificationId(externalId, type);
}
