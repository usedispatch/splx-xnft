import {
  Action,
  ActionCreate,
  ActionCreateInput,
  ActionCrud,
  ActionEntityJson,
  ActionParams,
  ActionRpc,
  BaseActionParams,
  Crud,
} from './types';
import { EntityJson, EntityType, ModelStatus } from '@dispatch-services/db-forum-common/entities/types';
import { ParsedPinId, ParsedPostboxId, getPostboxPinId, getTypeFromId, parseId } from '../entities';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';

export function createAction<T extends EntityType, C extends Crud>(
  type: T,
  crud: C,
  params: ActionCreateInput<typeof type, typeof crud>
): Action<typeof type> {
  return {
    type,
    crud,
    ...params,
  } as unknown as Action<typeof type>;
}

export function getDefaultActionParams<T extends EntityType>(type: T, parentId: string) {
  switch (type) {
    case EntityType.Admin: {
      const actionParams: ActionParams<EntityType.Admin> = { entityId: '', parentId };
      return actionParams;
    }
    case EntityType.Count: {
      const actionParams: ActionParams<EntityType.Count> = {
        admins: 0,
        children: 0,
        downVotes: 0,
        score: 0,
        upVotes: 0,
        actions: 0,
      };
      return actionParams;
    }
    case EntityType.Forum: {
      const actionParams: ActionParams<EntityType.Forum> = {
        body: '',
        title: '',
        image: '',
        url: '',
        subtitle: '',
        mentions: [],
        media: [],
        programId: '',
      };
      return actionParams;
    }
    case EntityType.InteractionVote: {
      const actionParams: ActionParams<EntityType.InteractionVote> = { value: 0 };
      return actionParams;
    }
    case EntityType.Pin: {
      const pinId = getPostboxPinId(parentId);
      const parsedPinId = parseId(pinId) as ParsedPinId;
      const entity: ParsedPostboxId[] = parsedPinId.parent as ParsedPostboxId[];
      const entityId = entity[entity.length - 1].id;
      const actionParams: ActionParams<EntityType.Pin> = {
        entityId,
        pinned: true,
      };
      return actionParams;
    }
    case EntityType.Post: {
      const actionParams: ActionParams<EntityType.Post> = {
        body: '',
        title: '',
        image: '',
        url: '',
        subtitle: '',
        mentions: [],
        media: [],
        programId: '',
      };
      return actionParams;
    }
    case EntityType.Profile: {
      const actionParams: ActionParams<EntityType.Profile> = {
        parentId,
        image: '',
        name: '',
        twitter: '',
        twitterUserId: '',
      };
      return actionParams;
    }
    case EntityType.ProductTopic: {
      const actionParams: ActionParams<EntityType.ProductTopic> = {
        body: '',
        title: '',
        image: '',
        url: '',
        subtitle: '',
        mentions: [],
        media: [],
        programId: '',
      };
      return actionParams;
    }
    case EntityType.Topic: {
      const actionParams: ActionParams<EntityType.Topic> = {
        body: '',
        title: '',
        image: '',
        url: '',
        subtitle: '',
        mentions: [],
        media: [],
        programId: '',
      };
      return actionParams;
    }
    case EntityType.Vote: {
      const actionParams: ActionParams<EntityType.Vote> = { value: 0 };
      return actionParams;
    }
    case EntityType.User: {
      const actionParams: ActionParams<EntityType.User> = { did: '' };
      return actionParams;
    }
    case EntityType.Wallet: {
      const actionParams: ActionParams<EntityType.Wallet> = { address: '', chainId: ChainId.Unknown, parentId };
      return actionParams;
    }
    default: {
      return undefined;
    }
  }
}

export function getDefaultActionCreateInput<T extends EntityType, C extends Crud>(
  type: T,
  crud: C,
  targetId: string
): ActionCreateInput<T, C> | undefined {
  let parentId = '';
  let crudEntityId = '';
  if (crud === Crud.Post) {
    parentId = targetId;
  } else {
    crudEntityId = targetId;
  }
  const baseActionParams: BaseActionParams = { parentId };
  const actionCrud: ActionCrud = { crud, type, crudEntityId };
  const params = getDefaultActionParams(type, parentId);
  if (!params) {
    return;
  }
  return {
    ...baseActionParams,
    ...actionCrud,
    params,
  } as unknown as ActionCreateInput<T, C>;
}

/**
 * Generate action json from an rpc. This is intended to be use before sending to server, so placeholder actionId and blockOrder is necessary.
 * @param rpc
 * @param actionId
 * @param blockOrder
 */
export function createActionJsonFromRpc<E extends EntityType, C extends Crud>(
  rpc: ActionRpc<E, C>,
  actionId: string,
  blockOrder: string
): ActionEntityJson {
  const { chainId, creatorId, wallet, hash, action } = rpc;
  const { block, timestamp, txn } = parseBlockOrder(blockOrder);
  return {
    id: actionId,
    actionId,
    action,
    block,
    blockOrder,
    chainId,
    creatorId,
    hash,
    nonce: '',
    originalTargetId: '',
    parentId: rpc.action.parentId ?? '',
    pendingActionId: '',
    pendingId: actionId,
    status: ModelStatus.Pending,
    tags: (action.params as any)?.tags ?? [],
    time: timestamp,
    txId: '',
    txn,
    wallet,
    updatedBlockOrder: '',
    deletedBy: '',
  };
}

export function createActionJsonFromEntity(entityJson: EntityJson<any>): ActionEntityJson {
  const { actionId, blockOrder, chainId, creatorId, id, parentId, wallet, deletedBy, pendingActionId, txId } =
    entityJson;
  const { block, timestamp, txn } = parseBlockOrder(blockOrder);
  const type = getTypeFromId(id);
  const params = Object.keys(getDefaultActionParams(type, parentId) as ActionParams<typeof type>).reduce<
    ActionParams<typeof type>
  >((acc, param) => {
    acc[param] = entityJson[param];
    return acc;
  }, {});
  const action: ActionCreate<typeof type, Crud.Post> = { parentId, crud: Crud.Post, type, params };
  return {
    id: actionId,
    actionId,
    action,
    block,
    blockOrder,
    chainId,
    creatorId,
    deletedBy,
    hash: '',
    nonce: '',
    originalTargetId: '',
    parentId,
    pendingActionId: '',
    pendingId: pendingActionId ?? actionId,
    status: ModelStatus.Pending,
    tags: [],
    time: timestamp,
    txn,
    txId,
    wallet,
    updatedBlockOrder: '',
  };
}
