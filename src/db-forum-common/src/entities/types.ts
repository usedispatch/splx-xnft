import {
  ActionDeleteKeyJson,
  ActionEntityJson,
  AdminJson,
  CountJson,
  ForumJson,
  InteractionScoreJson,
  InteractionVoteJson,
  NotificationJson,
  NotificationReadJson,
  PinJson,
  PostJson,
  ProductTopicJson,
  ProfileJson,
  QueueItemJson,
  TagJson,
  TopicJson,
  UserJson,
  UserSettingsJson,
  VerificationJson,
  VerifiedEntityJson,
  VoteJson,
  WalletJson,
  WalletProxyJson,
} from '@dispatch-services/db-forum-common/actions';
import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

// Key is Kind, Value is id. 0-255 allowed.
export enum EntityType {
  Unknown = 0,
  Action = 10,
  ActionDeleteKey = 15,
  Admin = 20,
  Block = 30,
  Count = 40,
  CountUser = 41,
  Forum = 50,
  InteractionScore = 59,
  InteractionVote = 60,
  Notification = 80,
  NotificationRead = 81,
  Post = 100, // Leave plenty of room for interactions.
  Profile = 110,
  RestrictionRule = 120,
  Restriction = 130,
  Tag = 131,
  TagLink = 132,
  Topic = 140,
  ProductTopic = 141,
  Pin = 145,
  QueueItem = 147,
  User = 150,
  Settings = 151,
  UserSettings = 152,
  Verification = 155,
  VerifiedEntity = 156,
  Vote = 160,
  Wallet = 170,
  WalletProxy = 180,
}

export type EntityJson<T extends EntityType> = T extends EntityType.Action
  ? ActionEntityJson
  : T extends EntityType.ActionDeleteKey
  ? ActionDeleteKeyJson
  : T extends EntityType.Admin
  ? AdminJson
  : T extends EntityType.Count
  ? CountJson
  : T extends EntityType.CountUser
  ? CountJson
  : T extends EntityType.Forum
  ? ForumJson
  : T extends EntityType.InteractionScore
  ? InteractionScoreJson
  : T extends EntityType.InteractionVote
  ? InteractionVoteJson
  : T extends EntityType.Notification
  ? NotificationJson
  : T extends EntityType.NotificationRead
  ? NotificationReadJson
  : T extends EntityType.Pin
  ? PinJson
  : T extends EntityType.Post
  ? PostJson
  : T extends EntityType.ProductTopic
  ? ProductTopicJson
  : T extends EntityType.Profile
  ? ProfileJson
  : T extends EntityType.QueueItem
  ? QueueItemJson
  : T extends EntityType.Tag
  ? TagJson
  : T extends EntityType.Topic
  ? TopicJson
  : T extends EntityType.User
  ? UserJson
  : T extends EntityType.UserSettings
  ? UserSettingsJson
  : T extends EntityType.Verification
  ? VerificationJson
  : T extends EntityType.VerifiedEntity
  ? VerifiedEntityJson
  : T extends EntityType.Vote
  ? VoteJson
  : T extends EntityType.Wallet
  ? WalletJson
  : T extends EntityType.WalletProxy
  ? WalletProxyJson
  : never;

export type PostboxEntityType =
  | EntityType.Forum
  | EntityType.Post
  | EntityType.ProductTopic
  | EntityType.Topic
  | EntityType.Vote;

export type PostboxEntityJson = EntityJson<PostboxEntityType>;

export enum ModelStatus {
  Unknown = -1,
  Pending = 0,
  Error = 1,
  Timeout = 1.5,
  Active = 2,
  Canceled = 2.5,
  Deleted = 3,
}

export enum TagType {
  Unknown = 0,
  Category = 10,
  Fundraising = 20,
  Organization = 30,
  Product = 40,
}

export enum VerificationType {
  Unknown = 0,
  Twitter = 10,
}

export function isPostboxEntity(type: EntityType) {
  return (
    type === EntityType.Forum ||
    type === EntityType.Post ||
    type === EntityType.ProductTopic ||
    type === EntityType.Topic ||
    type === EntityType.Vote
  );
}

export function typeToInteractionType(type: EntityType) {
  switch (type) {
    case EntityType.Vote:
      return EntityType.InteractionVote;
    default:
      return EntityType.Unknown;
  }
}

// b64url (which we use for it to be url safe) uses the following charset: [A-Z][a-z][0-9][_-] so make sure the Id delims do
// not use those characters.
export enum IdDelim {
  Base = ',',
  EntityType = ':',
  Heirarchical = '&',
  Link = '+',
  Join = '?',
}

export function delim(type: IdDelim): string {
  return EntityType[type];
}

export const entityIdTypeReg = new RegExp(`(?:.(?!${IdDelim.EntityType}))+$`);
export const linkReg = new RegExp(`(?:.(?!\\${IdDelim.Link}))+$`);

export function typeToKind(type: EntityType) {
  return EntityType[type];
}

export function hexToEntityType(hex: string): EntityType {
  const num = hexToNum(hex) ?? EntityType.Unknown;
  return Number.isNaN(num) ? EntityType.Unknown : num;
}

export function entityTypeToHex(type: EntityType): string {
  return numToHex(type, 16) ?? EntityType[EntityType.Unknown];
}

export function hexToEntityKind(hex: string) {
  const type = hexToEntityType(hex);
  return typeToKind(type);
}

export const pendingActionIdReg = /^Pending\d+$/;
export const optimisticIdReg = /\d+\?[A-Za-z0-9_-]+/g;
export const optimisticIdTimeReg = /\d+\?/g;
