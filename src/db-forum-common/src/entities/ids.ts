import { ChainId, chainIdToHex, hexToChainId } from '@dispatch-services/db-forum-common/chains';
import {
  EntityJson,
  EntityType,
  IdDelim,
  PostboxEntityType,
  TagType,
  VerificationType,
  entityIdTypeReg,
  entityTypeToHex,
  hexToEntityType,
  isPostboxEntity,
  linkReg,
  optimisticIdReg,
  pendingActionIdReg,
  typeToKind,
} from './types';
import { ParsedBlockOrder, packBlockTxn, parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';
import { QueueType, hexToQueueType, queueTypeToHex } from '../queue';
import { hexToNum, numToHex, toSnakeCase, toUpperSpaceCase } from '@dispatch-services/utils-common/string';

import { Json } from '@dispatch-services/utils-common/json';
import { TagActionParams } from '../actions';
import { nowSec } from '@dispatch-services/utils-common/timers';
import { register } from '@dispatch-services/utils-common/singleton';

/**
There are 4 kinds of Ids:
- Directory / Heirarchical 
  - A heirarchical Id like that of a directory structure -- postbox entities are these.
  - Schema: `${EntityType}_${blockOrder}_${actionId}-...repeated`
  - Note: Forum is in reverse to make sure sharding is done properly.
- Link
  - An Id for a model that links two models together, like an Admin or a Restriction.
  - Schema: `${oneEntityId}+${toManyEntityId}:${EntityType}`
- Child
  - An Id for an informational model like a profile.
  - Schema: `${parentId}:${EntityType}`
- Parent 
  - An Id for an entity created by an Action that has no parents like a User.
  - Schema: `${actionId}:${EntityType}`

  Individual Ids have information concatenated by '_'
  ex of a User: abc123xyz789
  ex of a Forum: def456ghi123_14_000000000000F424003E8
  Composite Ids -- Ids that are comprised of other Ids -- are separated by '-'
  ex of an Admin (User-Forum): abc123xyz789-def456ghi123_14_000000000000F424003E8
 */

const keyPrefix = '@dispatch-services/db-forum-common/entities#';

const { entityRegistry, parsedIds, normalizedIds } = register(() => {
  const entityRegistry: { [type: number]: IdDelim } = {};
  const parsedIds: { [id: string]: ParsedId } = {};
  const normalizedIds: { [id: string]: string } = {};
  return {
    entityRegistry,
    normalizedIds,
    parsedIds,
  };
}, `${keyPrefix}global`);

function registerIdType(delim: IdDelim, type: EntityType) {
  if (!entityRegistry[type]) {
    entityRegistry[type] = delim;
  }
  return entityRegistry[type];
}

function generateBaseId(parts: string[]) {
  return parts.join(IdDelim.Base);
}

export function generateParentId(type: EntityType, ...args: string[]) {
  return `${generateBaseId(args)}${IdDelim.EntityType}${entityTypeToHex(type)}`;
}

export function generateLinkId(type: EntityType, oneId: string, toManyId: string) {
  registerIdType(IdDelim.Link, type);
  return generateParentId(type, `${toManyId}${IdDelim.Link}${oneId}`);
}

function parseLink(id: string) {
  const match = id.match(linkReg);
  if (!match) {
    // Note(Partyman): This may not be the right thing to do.
    return [id, ''];
  }
  const idx = match.index as number;
  const toManyId = id.substring(0, idx);
  const oneId = id.substring(idx + 1);
  return [toManyId, oneId];
}

export function generateHeirarchicalId(type: EntityType, parentId: string, ...args: string[]) {
  registerIdType(IdDelim.Heirarchical, type);
  return `${parentId}${parentId ? IdDelim.Heirarchical : ''}${generateBaseId(args)}`;
}

export function generateActionDeleteKeyId(actionId: string) {
  return generateParentId(EntityType.ActionDeleteKey, actionId);
}

function parseActionDeleteKeyId(actionId: string): ParsedActionDeleteId {
  return {
    actionId,
    type: EntityType.ActionDeleteKey,
  };
}

export function generateAdminId(entityId: string, administratedEntityId: string) {
  return generateLinkId(EntityType.Admin, entityId, administratedEntityId);
}

function parseUnknownId(id: string): ParsedUnknownId {
  return {
    id,
    type: EntityType.Unknown,
  };
}

export function generatePendingActionId(actionId: string) {
  return [nowSec(), actionId].join(IdDelim.Join);
}

export function getPendingTimestampFromActionId(actionId: string) {
  if (!isOptimisticActionId(actionId)) {
    return;
  }
  return parseInt(actionId.split(IdDelim.Join)[0]);
}

export function getActionIdFromOptimisticActionId(actionId: string) {
  const parts = actionId.split(IdDelim.Join);
  return parts.length === 1 ? parts[0] : parts[1];
}

function parseActionId(id: string): ParsedActionId {
  const isOptimistic = isOptimisticActionId(id);
  const actionId = getActionIdFromOptimisticActionId(id);
  const parsedActionId: ParsedActionId = {
    id,
    actionId,
    isOptimistic,
    type: EntityType.Action,
  };
  if (isOptimistic) {
    parsedActionId.timestamp = getPendingTimestampFromActionId(id);
  }
  return parsedActionId;
}

function parseAdminId(id: string): ParsedAdminId {
  const [administratedEntityId, entityId] = parseLink(id);
  return {
    id,
    type: EntityType.Admin,
    entity: parseId(entityId),
    parent: parseId(administratedEntityId),
  };
}

export function generateBlockId(chainId: ChainId) {
  return generateParentId(EntityType.Block, chainIdToHex(chainId));
}

function parseBlockId(id: string): ParsedBlockId {
  return {
    type: EntityType.Block,
    chainId: hexToChainId(id),
  };
}

export function generateCountId(parentId: string, chainId: ChainId) {
  return generateLinkId(EntityType.Count, chainIdToHex(chainId), parentId);
}

function parseCountId(id: string): ParsedCountId {
  const [parentId, chainId] = parseLink(id);
  return {
    id,
    chainId: hexToChainId(chainId),
    type: EntityType.Count,
    parent: parseId(parentId),
  };
}

export function generateCountUserId(parentId: string, chainId: ChainId) {
  return generateLinkId(EntityType.CountUser, chainIdToHex(chainId), parentId);
}

function parseCountUserId(id: string): ParsedCountUserId {
  const [parentId, chainId] = parseLink(id);
  return {
    id,
    chainId: hexToChainId(chainId),
    type: EntityType.CountUser,
    parent: parseId(parentId) as ParsedUserId,
  };
}

export function generateInteractionId(creatorId: string, parentId: string) {
  return generateLinkId(EntityType.InteractionVote, creatorId, parentId);
}

function parseInteractionId(id: string): ParsedInteractionId {
  const [parentId, entityId] = parseLink(id);
  return {
    id,
    type: EntityType.InteractionVote,
    entity: parseId(entityId),
    parent: parseId(parentId),
  };
}

export function generateInteractionScoreId(verificationId: string, parentId: string) {
  return generateLinkId(EntityType.InteractionScore, verificationId, parentId);
}

function parseInteractScoreId(id: string): ParsedInteractionScoreId {
  const [parentId, entityId] = parseLink(id);
  return {
    id,
    type: EntityType.InteractionScore,
    entity: parseId(entityId) as ParsedVerificationId,
    parent: parseId(parentId),
  };
}

export function generateNotificationId(actionId: string, notificationTargetId: string) {
  return generateLinkId(EntityType.Notification, actionId, notificationTargetId);
}

function parseNotificationId(id: string): ParsedNotificationId {
  const [notificationTargetId, actionId] = parseLink(id);
  return {
    id,
    type: EntityType.Notification,
    entity: parseId(actionId) as ParsedActionId,
    parent: parseId(notificationTargetId) as ParsedUserId,
  };
}

export function generateNotificationReadId(parentId: string) {
  return generateParentId(EntityType.NotificationRead, parentId);
}

function parseNotificationReadId(id: string): ParsedNotificationReadId {
  return {
    id,
    type: EntityType.NotificationRead,
    parent: parseId(id) as ParsedUserId,
  };
}

export function generatePinId(entityId: string) {
  return generateParentId(EntityType.Pin, entityId);
}

function parsePinId(id: string): ParsedPinId {
  return {
    id,
    type: EntityType.Pin,
    parent: parseId(id),
  };
}

export function generateProfileId(parentId: string) {
  return generateParentId(EntityType.Profile, parentId);
}

function parseProfileId(id: string): ParsedProfileId {
  return {
    id,
    type: EntityType.Profile,
    parent: parseId(id),
  };
}

export function generateQueueItemId(actionId: string, type: QueueType) {
  const hex = queueTypeToHex(type);
  return generateParentId(EntityType.QueueItem, actionId, hex);
}

function parseQueueItemId(id: string): ParsedQueueItemId {
  const [actionId, queueTypeHex] = id.split(IdDelim.Base);
  return {
    id,
    type: EntityType.QueueItem,
    actionId,
    queueType: hexToQueueType(queueTypeHex),
  };
}

export function generateRuleId(actionHash: string) {
  return generateParentId(EntityType.RestrictionRule, actionHash);
}

function parseRuleId(id: string): ParsedRuleId {
  return {
    id,
    type: EntityType.RestrictionRule,
    actionId: id,
  };
}

export function generateRestrictionId(parentId: string) {
  return generateParentId(EntityType.Restriction, parentId);
}

function parseRestrictionId(id: string): ParsedRestrictionId {
  return {
    id,
    type: EntityType.Restriction,
    parent: parseId(id),
  };
}

export function generateUserId(did: string) {
  return generateParentId(EntityType.User, did);
}

export function parseUserId(did: string): ParsedUserId {
  return {
    id: did,
    wallet: getWalletAddressFromDid(did),
    type: EntityType.User,
    actionId: did,
  };
}

export function generateUserSettingsId(userId: string) {
  return generateParentId(EntityType.UserSettings, userId);
}

export function parseUserSettingsId(id: string): ParsedUserSettingsId {
  return {
    id,
    type: EntityType.UserSettings,
    parent: parseId(id),
  };
}

export function generateVerificationId(uniqueExternalId: string, verificationType: VerificationType) {
  return generateParentId(EntityType.Verification, uniqueExternalId, numToHex(verificationType, 16));
}

export function parseVerificationId(id: string): ParsedVerificationId {
  const [externalId, verificationTypeHex] = id.split(IdDelim.Base);
  return {
    id,
    type: EntityType.Verification,
    externalId,
    verificationType: hexToNum(verificationTypeHex),
  };
}

export function generateVerifiedEntityId(entityId: string) {
  return generateParentId(EntityType.VerifiedEntity, entityId);
}

export function parseVerifiedEntityId(id: string): ParsedVerifiedEntityId {
  return {
    id,
    type: EntityType.VerifiedEntity,
    parent: parseId(id),
  };
}

export function generateWalletId(address: string, parentId: string) {
  return generateLinkId(EntityType.Wallet, address, parentId);
}

export function generateWalletProxyId(chainIdOrHex: ChainId | string, userId: string) {
  const chainIdHex = typeof chainIdOrHex === 'string' ? chainIdOrHex : chainIdToHex(chainIdOrHex);
  return generateLinkId(EntityType.WalletProxy, chainIdHex, userId);
}

function parseProxyWalletId(id: string): ParsedWalletProxyId {
  const [userId, chainIdHex] = parseLink(id);
  return {
    id,
    type: EntityType.WalletProxy,
    parent: parseId(userId),
    chainId: hexToChainId(chainIdHex),
  };
}

function parseWalletId(id: string): ParsedWalletId {
  const [parentId, address] = parseLink(id);
  return {
    id,
    type: EntityType.Wallet,
    address,
    parent: parseId(parentId),
  };
}

// Later, to make comment depth infinite, the parent will end up being the actionId of % 12th depth.
export function generatePostboxId(
  type: PostboxEntityType,
  timestamp: number,
  chainId: ChainId,
  block: number,
  txn: number,
  actionHash: string,
  parentId?: string
) {
  const idParams = [
    entityTypeToHex(type),
    packBlockTxn(timestamp, chainId, block, txn, getPostboxEpoch(parentId)),
    actionHash,
  ];
  type === EntityType.Forum && idParams.reverse();
  return generateHeirarchicalId(type, parentId ?? '', ...idParams);
}

const postboxEpochType = EntityType.Topic; // Epochs are from topic.
function getPostboxEpoch(id?: string) {
  if (!id) return;
  const parsedId = parsePostboxId(id);
  for (let i = 0; i < parsedId.length; i++) {
    if (parsedId[i].type === postboxEpochType) {
      return parsedId[i].blockOrder;
    }
  }
}

export function parsePostboxId(id: string): ParsedPostboxId[] {
  const ids = id.split(IdDelim.Heirarchical);
  let currId: string = '';
  let currActionId: string = '';
  let parsedEpoch: ParsedBlockOrder;
  let ancestorActionIds: AncestorActionIds = {};
  return ids.reduce<ParsedPostboxId[]>((acc, id, idx) => {
    if (currActionId) ancestorActionIds = { ...ancestorActionIds, ...{ [currActionId]: 1 } };
    currId = `${currId}${currId ? IdDelim.Heirarchical : ''}${id}`;
    if (!parsedIds[currId]) {
      const parts = id.split(IdDelim.Base);
      idx === 0 && parts.reverse();
      currActionId = parts[2];
      const parsedId: ParsedPostboxId = {
        id: currId,
        type: hexToEntityType(parts[0]) as PostboxEntityType,
        blockOrder: parseBlockOrder(parts[1], parsedEpoch),
        actionId: currActionId,
        ancestorActionIds,
      };
      // Make sure this is a copy since we are memoizing the array.
      acc = [...acc, parsedId];
      parsedIds[id] = [parsedId];
      parsedIds[currId] = acc;
    } else {
      const parsedId = parsedIds[currId] as ParsedPostboxId[];
      currActionId = parsedId[parsedId.length - 1].actionId;
      ancestorActionIds = { ...parsedId[parsedId.length - 1].ancestorActionIds };
      acc = parsedId;
    }
    if (!parsedEpoch && acc[acc.length - 1].type === EntityType.Topic) parsedEpoch = acc[acc.length - 1].blockOrder;
    return acc;
  }, []);
}

export function parseTagId(tagId: string): ParsedTagId {
  const [hexType, name] = tagId.split(IdDelim.EntityType);
  const tagType = hexToNum(hexType);
  const id = generateTagId(name, tagType);
  return {
    id,
    type: EntityType.Tag,
    tagType,
    name,
    displayName: toUpperSpaceCase(name),
  };
}

export function generateTagId(tagName: string, tagType: TagType) {
  const name = toSnakeCase(tagName).toLowerCase();
  return generateParentId(EntityType.Tag, [numToHex(tagType, 16), name].join(IdDelim.EntityType));
}

export function parseTagLinkId(id: string): ParsedTagLinkId {
  const [entityId, tagId] = parseLink(id);
  return {
    id,
    type: EntityType.TagLink,
    parent: parseId(tagId) as ParsedTagId,
    entity: parseId(entityId),
  };
}

export function generateTagLinkId(entityId: string, tagName: string, tagType: TagType) {
  return generateLinkId(EntityType.TagLink, generateTagId(tagName, tagType), entityId);
}

export interface IdParams extends Json {
  type: EntityType;
  actionId?: string;
  block?: number;
  chainId?: ChainId;
  childId?: string;
  entityId?: string;
  externalId?: string;
  parentId?: string;
  verificationId?: string;
  verificationType?: VerificationType;
  queueType?: QueueType;
  timestamp?: number;
  txn?: number;
}

export function generateId<T extends IdParams>(params: T): string {
  switch (params.type) {
    case EntityType.ActionDeleteKey: {
      const { actionId } = params;
      return generateActionDeleteKeyId(actionId ?? '');
    }
    case EntityType.Admin: {
      const { entityId, childId, parentId } = params;
      return generateAdminId(entityId ?? childId ?? '', parentId ?? '');
    }
    case EntityType.Block: {
      const { chainId } = params;
      return generateBlockId(chainId ?? ChainId.Unknown);
    }
    case EntityType.Count: {
      const { parentId, chainId } = params;
      return generateCountId(parentId ?? '', chainId ?? ChainId.Unknown);
    }
    case EntityType.CountUser: {
      const { parentId, chainId } = params;
      return generateCountUserId(parentId ?? '', chainId ?? ChainId.Unknown);
    }
    case EntityType.InteractionScore: {
      const { verificationId, entityId, childId, parentId } = params;
      return generateInteractionScoreId(verificationId ?? entityId ?? childId ?? '', parentId ?? '');
    }
    case EntityType.InteractionVote: {
      const { entityId, creatorId, childId, parentId } = params;
      return generateInteractionId(entityId ?? childId ?? creatorId ?? '', parentId ?? '');
    }
    case EntityType.Notification: {
      const { actionId, parentId } = params;
      return generateNotificationId(actionId ?? '', parentId ?? '');
    }
    case EntityType.NotificationRead: {
      const { parentId } = params;
      return generateNotificationReadId(parentId ?? '');
    }
    case EntityType.Pin: {
      const { entityId } = params;
      return generatePinId(entityId ?? '');
    }
    case EntityType.Profile: {
      const { parentId } = params;
      return generateProfileId(parentId ?? '');
    }
    case EntityType.QueueItem: {
      const { actionId, queueType } = params;
      return generateQueueItemId(actionId ?? '', queueType ?? QueueType.Unknown);
    }
    case EntityType.Restriction: {
      const { parentId } = params;
      return generateRestrictionId(parentId ?? '');
    }
    case EntityType.RestrictionRule: {
      const { actionId } = params;
      return generateRuleId(actionId ?? '');
    }
    case EntityType.User: {
      const { actionId } = params;
      return generateUserId(actionId ?? '');
    }
    case EntityType.Verification: {
      const { externalId, verificationType } = params;
      return generateVerificationId(externalId ?? '', verificationType ?? VerificationType.Unknown);
    }
    case EntityType.VerifiedEntity: {
      const { entityId } = params;
      return generateVerifiedEntityId(entityId ?? '');
    }
    case EntityType.UserSettings: {
      const { parentId } = params;
      return generateUserSettingsId(parentId ?? '');
    }
    case EntityType.Wallet: {
      const { address, childId, parentId } = params;
      return generateWalletId(address ?? childId ?? '', parentId ?? '');
    }
    case EntityType.Forum:
    case EntityType.Post:
    case EntityType.ProductTopic:
    case EntityType.Topic:
    case EntityType.Vote: {
      const { block, chainId, timestamp, txn, actionId, parentId } = params;
      return generatePostboxId(
        params.type,
        timestamp ?? 0,
        chainId ?? ChainId.Unknown,
        block ?? 0,
        txn ?? 0,
        actionId ?? '',
        parentId
      );
    }
    default: {
      console.warn(`Tried to generate an Id for unknown type ${params.type}`);
      return '';
    }
  }
}

interface BaseParsedId {
  id: string;
}

export interface ParsedUnknownId {
  id: string;
  type: EntityType.Unknown;
}

export interface ParsedChildId {
  parent: ParsedId;
}

export interface ParsedLinkId extends ParsedChildId {
  entity: ParsedId;
}

export interface ParsedParentId {
  actionId: string;
}

export interface ParsedActionId extends BaseParsedId, ParsedParentId {
  type: EntityType.Action;
  isOptimistic: boolean;
  timestamp?: number;
}

export interface ParsedActionDeleteId extends ParsedParentId {
  type: EntityType.ActionDeleteKey;
}

export interface ParsedAdminId extends BaseParsedId, ParsedLinkId {
  type: EntityType.Admin;
}

export interface ParsedBlockId {
  type: EntityType.Block;
  chainId: ChainId;
}

export interface ParsedCountId extends BaseParsedId, ParsedChildId {
  type: EntityType.Count;
  chainId: ChainId;
}

export interface ParsedCountUserId extends BaseParsedId, ParsedChildId {
  type: EntityType.CountUser;
  chainId: ChainId;
  parent: ParsedUserId;
}

export interface ParsedNotificationId extends BaseParsedId, ParsedLinkId {
  type: EntityType.Notification;
  entity: ParsedActionId;
  parent: ParsedUserId;
}

export interface ParsedNotificationReadId extends BaseParsedId, ParsedChildId {
  type: EntityType.NotificationRead;
  parent: ParsedUserId;
}

export interface ParsedPinId extends BaseParsedId, ParsedChildId {
  type: EntityType.Pin;
}

export interface ParsedProfileId extends BaseParsedId, ParsedChildId {
  type: EntityType.Profile;
}

export interface ParsedQueueItemId extends BaseParsedId {
  type: EntityType.QueueItem;
  actionId: string;
  queueType: QueueType;
}

export interface ParsedRuleId extends BaseParsedId, ParsedParentId {
  type: EntityType.RestrictionRule;
}

export interface ParsedRestrictionId extends BaseParsedId, ParsedChildId {
  type: EntityType.Restriction;
}

export interface ParsedTagId extends BaseParsedId, TagActionParams {
  type: EntityType.Tag;
  tagType: TagType;
  name: string;
  displayName: string;
}

export interface ParsedTagLinkId extends BaseParsedId, ParsedLinkId {
  type: EntityType.TagLink;
  parent: ParsedTagId;
}

export interface ParsedUserId extends BaseParsedId, ParsedParentId {
  type: EntityType.User;
  wallet: string;
}

export interface ParsedUserSettingsId extends BaseParsedId, ParsedChildId {
  type: EntityType.UserSettings;
}

export interface ParsedVerificationId extends BaseParsedId {
  type: EntityType.Verification;
  externalId: string;
  verificationType: VerificationType;
}

export interface ParsedVerifiedEntityId extends BaseParsedId, ParsedChildId {
  type: EntityType.VerifiedEntity;
}

export interface ParsedWalletId extends BaseParsedId, ParsedChildId {
  type: EntityType.Wallet;
  address: string;
}

export interface ParsedWalletProxyId extends BaseParsedId, ParsedChildId {
  type: EntityType.WalletProxy;
  chainId: ChainId;
}

export interface AncestorActionIds {
  [actionId: string]: 1;
}

export interface ParsedPostboxId extends BaseParsedId, ParsedParentId {
  type: PostboxEntityType;
  blockOrder: ParsedBlockOrder;
  ancestorActionIds: AncestorActionIds;
}

export interface ParsedInteractionId extends BaseParsedId, ParsedLinkId {
  type: EntityType.InteractionVote;
}

export interface ParsedInteractionScoreId extends BaseParsedId, ParsedLinkId {
  type: EntityType.InteractionScore;
  entity: ParsedVerificationId;
}

export type ParsedId =
  | ParsedUnknownId
  | ParsedActionId
  | ParsedActionDeleteId
  | ParsedAdminId
  | ParsedBlockId
  | ParsedCountId
  | ParsedCountUserId
  | ParsedInteractionId
  | ParsedInteractionScoreId
  | ParsedNotificationId
  | ParsedNotificationReadId
  | ParsedPinId
  | ParsedProfileId
  | ParsedQueueItemId
  | ParsedRuleId
  | ParsedRestrictionId
  | ParsedTagId
  | ParsedUserId
  | ParsedUserSettingsId
  | ParsedVerificationId
  | ParsedVerifiedEntityId
  | ParsedWalletId
  | ParsedWalletProxyId
  | ParsedPostboxId[];

function parseEntityType(id: string): [EntityType, string] {
  const match = id.match(entityIdTypeReg);
  return [
    hexToEntityType(
      match ? (match[0][0] === IdDelim.EntityType ? match[0].slice(1) : '') : EntityType.Unknown.toString()
    ),
    id.slice(0, match?.index ?? undefined),
  ];
}

export function isOptimisticId(id: string) {
  return !!(id || '').match(optimisticIdReg);
}

export function isOptimisticActionId(actionId: string) {
  return actionId.includes(IdDelim.Join) && !actionId.includes(IdDelim.Base);
}

function isActionId(id: string) {
  return id.length === 16 || isOptimisticActionId(id) || !!id.match(pendingActionIdReg);
}

// TODO(Partyman): Make not recursive sometime.
export function parseId(entityId: string) {
  if (parsedIds[entityId]) {
    return parsedIds[entityId];
  }
  const [entityType, rId] = parseEntityType(entityId);
  let parsedId: ParsedId;
  let type = entityType;
  let id = rId;
  if (isActionId(entityId)) {
    id = entityId;
    type = EntityType.Action;
  } else if (isDid(entityId)) {
    id = entityId;
    type = EntityType.User;
  }
  switch (type) {
    case EntityType.Action: {
      parsedId = parseActionId(id);
      break;
    }
    case EntityType.ActionDeleteKey: {
      parsedId = parseActionDeleteKeyId(id);
      break;
    }
    case EntityType.Admin: {
      parsedId = parseAdminId(id);
      break;
    }
    case EntityType.Block: {
      parsedId = parseBlockId(id);
      break;
    }
    case EntityType.Count: {
      parsedId = parseCountId(id);
      break;
    }
    case EntityType.CountUser: {
      parsedId = parseCountUserId(id);
      break;
    }
    case EntityType.InteractionScore: {
      parsedId = parseInteractScoreId(id);
      break;
    }
    case EntityType.InteractionVote: {
      parsedId = parseInteractionId(id);
      break;
    }
    case EntityType.Notification: {
      parsedId = parseNotificationId(id);
      break;
    }
    case EntityType.NotificationRead: {
      parsedId = parseNotificationReadId(id);
      break;
    }
    case EntityType.Pin: {
      parsedId = parsePinId(id);
      break;
    }
    case EntityType.Profile: {
      parsedId = parseProfileId(id);
      break;
    }
    case EntityType.QueueItem: {
      parsedId = parseQueueItemId(id);
      break;
    }
    case EntityType.Restriction: {
      parsedId = parseRestrictionId(id);
      break;
    }
    case EntityType.RestrictionRule: {
      parsedId = parseRuleId(id);
      break;
    }
    case EntityType.Tag: {
      parsedId = parseTagId(id);
      break;
    }
    case EntityType.TagLink: {
      parsedId = parseTagId(id);
      break;
    }
    case EntityType.Unknown: {
      parsedId = parseUnknownId(entityId);
      break;
    }
    case EntityType.User: {
      parsedId = parseUserId(id);
      break;
    }
    case EntityType.UserSettings: {
      parsedId = parseUserSettingsId(id);
      break;
    }
    case EntityType.Verification: {
      parsedId = parseVerificationId(id);
      break;
    }
    case EntityType.VerifiedEntity: {
      parsedId = parseVerifiedEntityId(id);
      break;
    }
    case EntityType.Wallet: {
      parsedId = parseWalletId(id);
      break;
    }
    case EntityType.WalletProxy: {
      parsedId = parseProxyWalletId(id);
      break;
    }
    default: {
      try {
        parsedId = parsePostboxId(id || entityId);
      } catch (e) {
        // console.warn(`Tried to parse unknown id ${entityId}`);
        parsedId = parseUnknownId(entityId);
      }
      break;
    }
  }
  parsedIds[entityId] = parsedId;
  return parsedId;
}

export function getTypeFromId(id: string) {
  const parsedId = parseId(id);
  return Array.isArray(parsedId) ? parsedId[parsedId.length - 1].type : parsedId.type;
}

export function getKindFromId(id: string) {
  const type = getTypeFromId(id);
  return typeToKind(type);
}

export function getPostboxParentId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId.length === 1 ? '' : parsedId[parsedId.length - 2].id;
}

export function getPostboxForumId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[0].id;
}

export function getPostboxForumActionId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[0].actionId;
}

export function getPostboxTopicActionId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[1]?.actionId ?? '';
}

export function getPostboxBlockOrder(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[parsedId.length - 1].blockOrder;
}

export function getPostboxTopicId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  for (let i = 0; i < parsedId.length; i++) {
    if (parsedId[i].type === EntityType.Topic || parsedId[i].type === EntityType.ProductTopic) {
      return parsedId[i].id;
    }
  }
  return '';
}

export function getPostboxActionId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[parsedId.length - 1].actionId;
}

export function getPostboxChainId(id: string) {
  const parsedId = parseId(id) as ParsedPostboxId[];
  return parsedId[parsedId.length - 1].blockOrder.chainId;
}

export function getPostboxPinId(id: string) {
  return generatePinId(id);
}

export function getPostboxIdFromPin(pinId: string) {
  const parsedId = parseId(pinId) as ParsedPinId;
  const parent = parsedId.parent as ParsedPostboxId[];
  return parent[parent.length - 1].id;
}

function getParentFromParsedId(parsedId: ParsedId): ParsedId | undefined {
  return Array.isArray(parsedId)
    ? parsedId.length === 1
      ? parsedId[0]
      : parsedId[parsedId.length - 2]
    : (parsedId as any).parent;
}

export function getParentIdFromId(id: string): string {
  const parsedId = parseId(id);
  let parent = getParentFromParsedId(parsedId);
  if (Array.isArray(parent)) parent = getParentFromParsedId(parent);
  return (parent as any)?.id ?? '';
}

export function getAdminIdFromId(id: string, entityId: string) {
  const parsedId = parseId(id);
  const parentId = Array.isArray(parsedId) ? getPostboxForumId(id) : getParentIdFromId(id);
  return generateAdminId(entityId, parentId);
}

export function isValidId(entityId: string) {
  const [type] = parseEntityType(entityId);
  return !type || !!typeToKind(type);
}

export function getPostboxOrderPrefix(parsedId: ParsedPostboxId[]) {
  let parentId = '';
  for (let i = 0; i < parsedId.length; i++) {
    const { id, type } = parsedId[i];
    if (type === EntityType.Forum || type === EntityType.Topic) {
      parentId = id;
      if (type === EntityType.Topic) break;
    }
  }
  return parentId;
}

export function getBlockOrderPrefixFromId(id: string) {
  // If it is a normal entity or forum, get the entity type, otherwise get forum or topic id.
  const parsedId = parseId(id);
  if (!Array.isArray(parsedId)) {
    return entityTypeToHex(parsedId.type);
  }
  if (parsedId.length === 1) {
    // Then it's a forum, so we'll want to just return the entity type.
    return entityTypeToHex(parsedId[0].type);
  }
  return getPostboxOrderPrefix(parsedId);
}

export function getNextPostboxId(postboxId: string) {
  const parsedId = parseId(postboxId) as ParsedPostboxId[];
  const { blockOrder, type, actionId } = parsedId[parsedId.length - 1];
  const { timestamp, block, chainId, txn } = blockOrder;
  const nextActionId = `${actionId.slice(0, -1)}${String.fromCharCode(actionId.slice(-1).charCodeAt(0) + 1)}`;
  const parentId = type === EntityType.Forum ? '' : getParentIdFromId(postboxId);
  return generatePostboxId(type, timestamp, chainId, block, txn, nextActionId, parentId);
}

export function isActionEntity(entity: EntityJson<any>) {
  return (
    entity?.id &&
    entity?.actionId &&
    (entity.id === entity.actionId || entity.actionId === (entity as EntityJson<EntityType.Action>).pendingId)
  );
}

export function isPostboxId(id: string) {
  return isPostboxEntity(getTypeFromId(id));
}

export function createDid(walletStr: string) {
  return `tmpdid-${walletStr}`;
}

function isDid(id: string) {
  return id.startsWith('tmpdid-') && !id.includes(IdDelim.EntityType);
}

export function getWalletAddressFromDid(did: string) {
  return did.split('-')?.[1] ?? '';
}

export function getUserIdFromWallet(address: string) {
  return generateUserId(createDid(address));
}

export function getParsedPostboxIdFromId(id: string): ParsedPostboxId[] | undefined {
  const parsedId = parseId(id);
  if (Array.isArray(parsedId)) {
    return parsedId;
  }
  if (Array.isArray((parsedId as ParsedLinkId).parent)) {
    return (parsedId as ParsedLinkId).parent as ParsedPostboxId[];
  }
  if (Array.isArray((parsedId as ParsedLinkId).entity)) {
    return (parsedId as ParsedLinkId).entity as ParsedPostboxId[];
  }
}

export function hasAncestorPostboxId(id: string, ancestorId: string) {
  const parsedPostboxId = getParsedPostboxIdFromId(id);
  return !!parsedPostboxId?.find((i) => i.id === ancestorId);
}

export function hasAncestorActionId(id: string, actionId: string) {
  const parsedPostboxId = getParsedPostboxIdFromId(id);
  const ancestorActionIds = parsedPostboxId?.[parsedPostboxId.length - 1].ancestorActionIds;
  return !!ancestorActionIds?.[actionId];
}

/**
 * Normalize an by setting anywhere there's a block or time to zero. This will help correclating an
 * id in all parts of its lifecycle.
 */
export function normalizeId(id: string) {
  if (normalizedIds[id]) {
    return normalizedIds[id];
  }
  if (!getParsedPostboxIdFromId(id)) {
    normalizedIds[id] = id;
    return normalizedIds[id];
  }

  const parsedId = parseId(id) as any;
  if (Array.isArray(parsedId)) {
    // Then it's a postbox and we want to regenerate the id properly.
    const ids: string[] = [];
    for (let i = 0; i < parsedId.length; i++) {
      const { actionId, type, blockOrder } = parsedId[i] as ParsedPostboxId;
      const { chainId } = blockOrder;
      const parentId = i > 0 ? ids[i - 1] : '';
      ids.push(generatePostboxId(type, 0, chainId, 0, 0, getActionIdFromOptimisticActionId(actionId), parentId));
    }
    const normalizedId = ids[ids.length - 1];
    normalizedIds[id] = normalizedId;
    return normalizedIds[id];
  }
  let entityId = '';
  if (Array.isArray(parsedId.entity)) {
    entityId = normalizeId(parsedId.entity[parsedId.entity.length - 1].id);
  } else if (parsedId.entity) {
    entityId = parsedId.entity.id;
  }
  let parentId = '';
  if (Array.isArray(parsedId.parent)) {
    parentId = normalizeId(parsedId.parent[parsedId.parent.length - 1].id);
  } else if (parsedId.parent) {
    parentId = parsedId.parent.id;
  }
  if (!entityId && !parentId) {
    normalizedIds[id] = id;
    return normalizedIds[id];
  }
  const chainId =
    parsedId.chainId ?? getPostboxChainId(entityId && getParsedPostboxIdFromId(entityId) ? entityId : parentId);

  const normalizedId = generateId({
    block: 0,
    chainId,
    entityId,
    parentId,
    timestamp: 0,
    txn: 0,
    type: parsedId.type,
  });
  normalizedIds[id] = normalizedId;
  return normalizedIds[id];
}
