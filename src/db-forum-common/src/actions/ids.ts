import { ActionCreate, ActionCreateInput, ActionEntityJson, ActionLog, ActionMap, Crud } from './types';
import { ChainId, chainIdToHex } from '@dispatch-services/db-forum-common/chains';
import {
  EntityType,
  IdDelim,
  IdParams,
  ParsedPostboxId,
  generateId,
  generatePostboxId,
  getActionIdFromOptimisticActionId,
  getParentIdFromId,
  getParsedPostboxIdFromId,
  isOptimisticActionId,
  isOptimisticId,
  parseId,
} from '@dispatch-services/db-forum-common/entities';

import { parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';
import { toHash64 } from '@dispatch-services/utils-common/string';

// These methods should really be in here but would create a circular import, so we just export it here to pretend.
export {
  generatePendingActionId,
  getPendingTimestampFromActionId,
  isOptimisticActionId,
  getActionIdFromOptimisticActionId,
} from '@dispatch-services/db-forum-common/entities';

export function generateIdFromLog<T extends ActionLog>(log: T) {
  // There's an edit / delete here that we'll need to account for.
  if (log.action.crud !== Crud.Post) {
    return log.action.crudEntityId as string;
  }
  const { actionId, block, txn, timestamp, chainId, action } = log;
  const { type, parentId } = action;
  const params: IdParams = {
    type,
    actionId,
    block,
    chainId,
    parentId,
    timestamp,
    txn,
  };
  return generateId({ ...params, ...log.action });
}

export function generateActionId<T extends EntityType, C extends Crud>(
  creatorId: string,
  nonce: string,
  action: ActionCreate<T, C>
) {
  return toHash64(JSON.stringify([creatorId, nonce, action]), 12);
}

export function getTargetKeyFromAction(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  const { crud } = action;
  return crud === Crud.Post ? 'parentId' : 'crudEntityId';
}

export function getTargetIdFromActionCreateInput<T extends EntityType, C extends Crud>(
  action: ActionCreateInput<T, C>
) {
  const { crud, parentId, crudEntityId } = action;
  return (crud === Crud.Post ? parentId : crudEntityId) ?? '';
}

export function getTargetIdFromAction(action: ActionEntityJson) {
  return getTargetIdFromActionCreateInput(action.action);
}

/**
 * composedId => Id for an action that has been composed and sent to the server but hasn't come back yet with an actionId.
 * Not to be confused with "composingId" which is an action that is currently being composed and hasn't been sent to the server yet.
 * @param action
 * @returns A join of  [targetId, hex chainId, hash]
 */
export function getComposedIdFromAction(action: ActionEntityJson) {
  const targetId = getTargetIdFromAction(action);
  const { hash, chainId } = action;
  return [targetId, chainIdToHex(chainId), hash].join(IdDelim.Join);
}

export function getIdFromAction(actionJson: ActionEntityJson) {
  const { actionId, blockOrder, action } = actionJson;
  let block, time, txn;
  let chainId = actionJson.chainId;
  if (blockOrder) {
    const parsedBlockOrder = parseBlockOrder(blockOrder);
    block = parsedBlockOrder.block;
    time = parsedBlockOrder.timestamp;
    txn = parsedBlockOrder.txn;
    if (!chainId) chainId = parsedBlockOrder.chainId;
  } else {
    block = actionJson.block;
    time = actionJson.time;
    txn = actionJson.txn;
  }

  const { crudEntityId } = action;
  const params: IdParams = {
    actionId,
    block,
    chainId,
    timestamp: time,
    txn,
    ...action,
  };
  return crudEntityId ?? generateId(params);
}

export function getParentIdFromAction(actionJson: ActionEntityJson) {
  return getParentIdFromId(getIdFromAction(actionJson));
}

export function getPinnedEntityIdFromAction(actionJson: ActionEntityJson) {
  if (!Object.prototype.hasOwnProperty.call(actionJson.action.params, 'pin')) {
    return '';
  }
  return getIdFromAction(actionJson);
}

export function isOptimisticAction(action: ActionEntityJson) {
  const targetId = getTargetIdFromAction(action);
  const actionIds = getActionIdsFromId(targetId);
  for (let i = 0; i < actionIds.length; i++) {
    if (isOptimisticActionId(actionIds[i])) {
      return true;
    }
  }
  return false;
}

export function getActionIdsFromId(id: string) {
  const parsedId = parseId(id);
  if (Array.isArray(parsedId)) {
    return parsedId.map((i) => i.actionId);
  }
  const entity = (parsedId as any).entity;
  const parent = (parsedId as any).parent;
  const actionId = ((parsedId as any).actionId ?? '') as string;
  let actionIds: string[] = [actionId];
  if (entity) {
    actionIds = [...actionIds, ...getActionIdsFromId(Array.isArray(entity) ? entity[entity.length - 1].id : entity.id)];
  }
  if (parent) {
    actionIds = [...actionIds, ...getActionIdsFromId(Array.isArray(parent) ? parent[parent.length - 1].id : parent.id)];
  }
  return actionIds.filter((i) => !!i);
}

export function getLastActionIdFromId(id: string) {
  const actionIds = getActionIdsFromId(id);
  return actionIds[actionIds.length - 1];
}

export function regenerateIdWithAction(id: string, actions: ActionMap) {
  if (!getParsedPostboxIdFromId(id)) {
    return id;
  }
  const parsedId = parseId(id) as any;
  // if it's an array, then it's a postbox, if not, then we want to regenerate the parent or entity if they are postbox.
  // then pass that back in.
  if (Array.isArray(parsedId) && isOptimisticId(id)) {
    // Then it's a postbox and we want to regenerate the id properly.
    const ids: string[] = [];
    for (let i = 0; i < parsedId.length; i++) {
      const { actionId, type } = parsedId[i] as ParsedPostboxId;
      const action = actions[getActionIdFromOptimisticActionId(actionId)];
      if (action && actionId !== action.actionId) {
        // Then it's a pendingId.
        const parentId = i > 0 ? ids[i - 1] : '';
        ids.push(
          generatePostboxId(type, action.time, action.chainId, action.block, action.txn, action.actionId, parentId)
        );
      } else {
        ids.push(parsedId[i].id);
      }
    }
    return ids[ids.length - 1];
  }
  let entityId = '';
  if (Array.isArray(parsedId.entity)) {
    entityId = regenerateIdWithAction(parsedId.entity[parsedId.entity.length - 1].id, actions);
  } else if (parsedId.entity) {
    entityId = parsedId.entity.id;
  }
  let parentId = '';
  if (Array.isArray(parsedId.parent)) {
    parentId = regenerateIdWithAction(parsedId.parent[parsedId.parent.length - 1].id, actions);
  } else if (parsedId.parent) {
    parentId = parsedId.parent.id;
  }
  let actionId = parsedId.actionId;
  if (actionId) {
    actionId = getActionIdFromOptimisticActionId(parsedId.actionId);
  }
  if (!entityId && !parentId && !actionId) {
    return id;
  }
  let chainId = parsedId.chainId || ChainId.Unknown;
  let block = 0;
  let txn = 0;
  let timestamp = 0;
  const action = actions[actionId];
  if (action) {
    chainId = action.chainId;
    block = action.block;
    txn = action.txn;
    timestamp = action.time;
  }
  return generateId({
    block,
    chainId,
    entityId,
    parentId,
    timestamp,
    txn,
    type: parsedId.type,
  });
}
