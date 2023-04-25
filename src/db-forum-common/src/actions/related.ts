import { ActionCreate, ActionEntityJson, Crud } from './types';
import {
  EntityType,
  ParsedUserId,
  generateAdminId,
  generateCountId,
  generateCountUserId,
  generateInteractionId,
  generateProfileId,
  generateUserId,
  generateUserSettingsId,
  generateWalletId,
  generateWalletProxyId,
  getParentIdFromId,
  getPostboxPinId,
  parseId,
} from '@dispatch-services/db-forum-common/entities';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { getIdFromAction } from './ids';
import { tagsParamsToTagIds } from '../tags';

export function getAdminId<E extends EntityType, C extends Crud>(action: ActionCreate<E, C>, creatorId: string) {
  const entityId = (action.crud === Crud.Post ? action.parentId : action.crudEntityId) as string;
  const parsedId: any = parseId(entityId);
  // If it's an array, it's a postbox, so the admin is on the forum.
  const id: string = Array.isArray(parsedId) ? parsedId[0].id : parsedId.parent ? parsedId.parent.id : parsedId.id;
  const parsedCreatorId: any = parseId(creatorId);
  const creator = Array.isArray(parsedCreatorId)
    ? parsedCreatorId[0].id
    : parsedCreatorId.parent
    ? parsedCreatorId.parent.id
    : parsedCreatorId.id;
  if (id === creator) {
    return;
  }
  return generateAdminId(creatorId, id);
}

export function getRelatedAdminIds<C extends Crud>(
  action: ActionCreate<EntityType.Admin, C>,
  creatorId: string,
  chainId: ChainId
) {
  const adminId = getAdminId(action, creatorId);
  const parentId = action.parentId ? action.parentId : getParentIdFromId(action.crudEntityId ?? '');
  const ids: string[] = [];
  if (adminId) {
    ids.push(adminId);
  }
  if (parentId) {
    ids.push(generateCountId(parentId, chainId));
  }
  return ids;
}

export function getRelatedPostboxIds<C extends Crud>(
  actionJson: ActionEntityJson,
  creatorId: string,
  wallet: string,
  chainId: ChainId
): string[] {
  const { action } = actionJson;
  const ids: string[] = [];
  if (action.crud !== Crud.Post) {
    const adminId = getAdminId(action, creatorId);
    adminId && ids.push(adminId);
  }
  let parentId = '';
  // Get the parentId if it's not a forum (if it's a forum, there is no parentId);
  if (action.type !== EntityType.Forum) {
    parentId = action.parentId ? action.parentId : getParentIdFromId(action.crudEntityId ?? '');
  }
  const hasPin = action.params && Object.hasOwnProperty.call(action.params, 'pin');

  // If it's a post or a vote, or a topic+delete we need to update the parent with vote count or children ct.
  if (
    (action.crud === Crud.Post && action.type !== EntityType.Forum) ||
    hasPin ||
    action.type === EntityType.Vote ||
    ((action.type === EntityType.Topic || action.type === EntityType.ProductTopic) && action.crud === Crud.Delete)
  ) {
    ids.push(parentId);
  }
  // If it's a vote and then we want to add the interaction as well to make sure creator didn't already vote on it.
  if (action.type === EntityType.Vote) {
    ids.push(generateInteractionId(creatorId, parentId));
  }
  // If it's a vote or it's not a put and it's not a forum, then get the count.
  if (action.type === EntityType.Vote || (action.crud !== Crud.Put && action.type !== EntityType.Forum)) {
    ids.push(generateCountId(parentId, chainId));
  }
  // Get tags if they are added to a topic.
  if ((action.params as any)?.tags?.length > 0) {
    const tagIds = tagsParamsToTagIds((action as ActionCreate<EntityType.Topic, C>).params.tags ?? []);
    tagIds.forEach((id) => ids.push(id));
  }

  // Get the pin if they are adding/deleting a pin.
  if (hasPin) {
    ids.push(getPostboxPinId(getIdFromAction(actionJson)));
  }

  // Now we want to get all the user models b/c if they don't exist, we'll need to create them.
  const parsedCreatorId = parseId(creatorId) as ParsedUserId;
  const did = parsedCreatorId.type === EntityType.User ? parsedCreatorId.actionId : undefined;
  if (did) {
    getRelatedUserIds(action as any, wallet, chainId, creatorId).forEach((id) => {
      ids.push(id);
    });
  }
  return ids;
}

export function getRelatedUserIds<E extends EntityType.User, C extends Crud>(
  action: ActionCreate<E, C>,
  wallet: string,
  chainId: ChainId,
  creatorId?: string
): string[] {
  // Need to get user, profile, wallet.
  // Action.parentId is actually the DID in a create.
  const userId =
    creatorId ??
    ((action.crud === Crud.Post
      ? generateUserId((action.parentId ?? action.params.did) as string)
      : action.crudEntityId) as string);
  const profileId = generateProfileId(userId);
  const walletId = generateWalletId(wallet, userId);
  const walletProxyId = generateWalletProxyId(chainId, userId);
  const userSettingsId = generateUserSettingsId(userId);
  const userCountId = generateCountUserId(userId, chainId);

  return [userId, userCountId, profileId, userSettingsId, walletId, walletProxyId];
}

export function getRelatedEntityIds(actionJson: ActionEntityJson) {
  const { action, creatorId, wallet, chainId } = actionJson;
  let ids: string[] = getRelatedUserIds(action, wallet, chainId, creatorId);
  switch (action.type) {
    case EntityType.Admin: {
      ids = ids.concat(getRelatedAdminIds(action as ActionCreate<typeof action.type, any>, creatorId, chainId));
      break;
    }
    case EntityType.Profile:
    case EntityType.Restriction:
    case EntityType.RestrictionRule:
    case EntityType.Wallet: {
      const adminId = getAdminId(action, creatorId);
      adminId && ids.push(adminId);
      break;
    }
    case EntityType.Forum:
    case EntityType.Post:
    case EntityType.ProductTopic:
    case EntityType.Topic:
    case EntityType.Vote: {
      ids = ids.concat(getRelatedPostboxIds(actionJson, creatorId, wallet, chainId));
      break;
    }
    case EntityType.User: {
      // ids = ids.concat(getRelatedUserIds(action, wallet));
      break;
    }
    default: {
      break;
    }
  }
  return [...new Set(ids)];
}
