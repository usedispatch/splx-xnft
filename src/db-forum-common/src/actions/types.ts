import { EntityType, ModelStatus, TagType } from '@dispatch-services/db-forum-common/entities/types';
import { QueueStatus, QueueType } from '../queue';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ErrorCode } from '../errors';

export enum Crud {
  Unknown = 0,
  Post = 1,
  Put = 2,
  Delete = 3,
}

export type MediaType = 'image' | 'video' | 'twitter' | 'discord';
export interface Media {
  type: MediaType;
  url: string;
}

export interface BufferJson {
  type: 'Buffer';
  data: number[];
}

export interface BaseParams {
  id: string;
  blockOrder: string;
  creatorId: string; // Who created the entity.
  chainId: ChainId;
  status: ModelStatus;
  wallet: string; // Wallet used to create the action.
  updatedBlockOrder: string;
  _localId?: string; // Added to items that are found with a locally generated id.
}

export interface BaseActionParams {
  parentId?: string; // Optional field if this belongs to another entity (like a profile belongs to a user).
}

export interface BaseTagsParams {
  tags?: TagActionParams[];
}

// The Json Base.json will return.
export interface BaseJson extends BaseParams, Required<BaseActionParams>, Required<BaseTagsParams> {
  actionId: string;
  deletedBy: string;
  pendingActionId: string;
  txId: string;
}

export interface PostboxParams {
  block: number; // The block this was created.
  depth: number; // depth from forum (forum is zero)
  time: number;
  txn: number; // The txn/slot this was created.
  updateTime: number;
  pins: string[];
}

export interface TagActionParams {
  displayName: string;
  tagType: TagType;
}

export interface PostboxActionParams extends BaseTagsParams {
  body?: string; // Optional field of the body of a postbox entity.
  title?: string; // Optional field of title of postbox entity.
  subtitle?: string;
  image?: string;
  url?: string;
  mentions?: string[];
  pin?: boolean;
  media?: Media[];
  programId?: string;
}

export interface CountJsonParams {
  admins: number;
  children: number;
  downVotes: number;
  score: number;
  upVotes: number;
  actions: number;
}

export interface CountJson extends BaseJson, CountJsonParams {}

export interface CountUserJson extends CountJson {}

export interface InteractionJson extends BaseJson {
  entityId: string;
}

// The JSON that Postbox.json will return.
export interface PostboxJson extends BaseJson, PostboxParams, Required<PostboxActionParams> {}

export interface ForumJson extends PostboxJson {}

export interface TagJson extends BaseJson {
  name: string;
}

export interface TopicJson extends PostboxJson {} // ParentId is forum

export interface PinActionParams {
  entityId: string;
  pinned: boolean;
}

export interface PinJson extends BaseJson, PinActionParams {}

export interface NotificationJson extends BaseJson {
  targetId: string;
  notificationTargetId: string;
}

export interface NotificationReadParams {
  lastReadId: string;
}

export interface NotificationReadJson extends BaseJson, NotificationReadParams {
  lastRead: string; // blockOrder lastReadTargetId
  lastReadTargetId: string; // PostboxId pertaining to action in lastReadId;
}

export interface ProductTopicJson extends PostboxJson {} // ParentId is forum

export interface PostJson extends PostboxJson {} // Parent Id is topic or post

export interface QueueItemParams {
  completedTime: number;
  executeTime: number;
  queueType: QueueType;
  queueStatus: QueueStatus;
  retries: number;
}

export interface QueueItemJson extends BaseJson, QueueItemParams {}

export interface VoteActionParams {
  value: number; // -1, 1, default 0
}

export interface InteractionVoteJson extends InteractionJson, VoteActionParams {}

export interface InteractionScoreParams {
  direct: number;
  score: number;
  voteId: string;
}

export interface InteractionScoreJson extends InteractionJson, InteractionScoreParams {}

export interface VerfiedEntityParams {
  disconnected: string[];
  verifications: string[];
  wallets: string[];
}

export interface VerifiedEntityJson extends BaseJson, VerfiedEntityParams {}

export interface VerificationParams {
  wallets: string[];
}

export interface VerificationJson extends BaseJson, VerificationParams {}

export interface VoteJson extends PostboxJson, VoteActionParams {}

export interface FullPostboxJson extends CountJson, PostboxJson, Partial<VoteActionParams> {}

export interface UserActionParams {
  did?: string; // Decentralized Id of the user.
}

// The Json User.json will return.
export interface UserJson extends BaseJson, Required<UserActionParams> {}

// Child entities.

export interface BaseProfileActionParams {
  parentId: string; // Entity that this is a profile of.
  name: string;
  image: string;
}

export interface TwitterConnectProfileActionParams {
  parentId: string;
  secret?: string;
  twitter: string;
  twitterUserId: string;
}

export interface TwitterProfileActionParams extends TwitterConnectProfileActionParams {
  disconnect?: boolean;
  image: string;
}

export interface ProfileActionParams extends BaseProfileActionParams, TwitterProfileActionParams {}

export interface ProfileFunds {
  [chainId: number]: number;
}

export interface ProfileProxyKeys {
  [chainId: number]: string[]; // publicKey, encryptedPrivateKey
}

// Child of a Parent Entity that has additional information like name.
// The JSON that
export interface ProfileJson extends BaseJson, ProfileActionParams {
  funds: ProfileFunds;
  proxyKeys: ProfileProxyKeys;
}

export interface AdminActionParams {
  parentId: string; // The entity being administrated.
  entityId: string; // The entity being given admin priviledges.
}

// Child of a Parent Entity that represents Admin priviledges.
export interface AdminJson extends BaseJson, Required<AdminActionParams> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SettingsActionParams extends BaseActionParams {}

export interface UserSettingsActionParams {
  preferWalletPopups?: boolean;
}

// Placeholder for now.
export interface SettingsJson extends BaseJson, Required<SettingsActionParams> {}

export interface UserSettingsJson extends SettingsJson, Required<UserSettingsActionParams> {}

export interface WalletActionParams {
  parentId: string; // The entity the wallet is attached to.
  address: string; // The wallet address.
  chainId: ChainId; // The chain the wallet is on.
}

// Child of a Parent Entity that represents a Wallet associated with that entity.
export interface WalletJson extends BaseJson, WalletActionParams {}

export interface WalletProxyJson extends WalletJson {
  proxyKey?: string;
  uuid?: string;
  expires: number;
}

export interface RestrictionActionParams {
  parentId: string; // What entity this restriction applies to.
  query?: string; // Maybe some kind of query that the rules fit into?
}

// Collection of RestrictionRules formed into And/Or queries. Extends Base.
export interface RestrictionJson extends BaseJson, Required<RestrictionActionParams> {}

export interface RestrictionRuleActionParams {
  parentId: string; // Who owns / can see / can choose this rule. Forum or User.
  address?: string; // What contract address to check.
  amount?: number; // The minimum amount of tokens a wallet needs on that contract.
  description?: string; // A description of the rule.
}

// Rule for restricting interaction with a postbox entity. Extends Base
export interface RestrictionRuleJson extends BaseJson, Required<RestrictionRuleActionParams> {}

export interface ActionCrud {
  crud: Crud;
  type: EntityType;
  crudEntityId?: string; // Id of entity being updated.
}

interface ActionCrudEdit {
  crudEntityId: string;
}

export type ActionParams<T extends EntityType> = T extends EntityType.Admin
  ? AdminActionParams
  : T extends EntityType.Count
  ? CountJsonParams
  : T extends EntityType.Forum
  ? PostboxActionParams
  : T extends EntityType.InteractionVote
  ? VoteActionParams
  : T extends EntityType.NotificationRead
  ? NotificationReadParams
  : T extends EntityType.Pin
  ? PinActionParams
  : T extends EntityType.Post
  ? PostboxActionParams
  : T extends EntityType.ProductTopic
  ? PostboxActionParams
  : T extends EntityType.Profile
  ? ProfileActionParams
  : T extends EntityType.QueueItem
  ? QueueItemParams
  : T extends EntityType.Restriction
  ? RestrictionActionParams
  : T extends EntityType.RestrictionRule
  ? RestrictionRuleActionParams
  : T extends EntityType.Topic
  ? PostboxActionParams
  : T extends EntityType.User
  ? UserActionParams
  : T extends EntityType.UserSettings
  ? UserSettingsActionParams
  : T extends EntityType.Vote
  ? VoteActionParams
  : T extends EntityType.Wallet
  ? WalletActionParams
  : never;

type ActionCreateBase<E extends EntityType, C extends Crud> = E extends EntityType.Forum
  ? BaseActionParams
  : E extends EntityType.User
  ? BaseActionParams
  : E extends EntityType.RestrictionRule
  ? BaseActionParams
  : C extends Crud.Post
  ? Required<BaseActionParams>
  : BaseActionParams;

type ActionCreateCrud<C extends Crud> = C extends Crud.Post ? ActionCrud : ActionCrud & ActionCrudEdit;

export type Action<T extends EntityType> = ActionCrud & BaseActionParams & { params: ActionParams<T> };
export type ActionCreate<E extends EntityType, C extends Crud> = ActionCreateBase<E, C> &
  ActionCreateCrud<C> & {
    params: C extends Crud.Post ? ActionParams<E> : Partial<ActionParams<E>>;
  };
export type ActionCreateInput<E extends EntityType, C extends Crud> = ActionCreateBase<E, C> &
  Partial<ActionCreateCrud<C>> & {
    params?: C extends Crud.Post ? ActionParams<E> : Partial<ActionParams<E>>;
  };

export interface Log {
  actionId: string;
  block: number; // Comes back from chain.
  chainId: ChainId; // We know which one b/c we asked for logs form it.
  fee: number;
  payment: number;
  timestamp: number; // Comes back from the chain.
  time: number; // Just to make it consistent with ActionEntityJson.
  txn: number; // Comes back from chain.
  wallet: string;
  signature?: string; // Comes back from chain.
  txId?: string; // same as signature but for use across chains.
}

export interface CrawledLog extends Log {
  updated: string;
  proxyWallet?: string;
}

export interface LocalMetadata {
  actionId?: string;
  actionDeleteKey?: string;
}

export interface ActionRpc<E extends EntityType, C extends Crud> {
  creatorId: string;
  wallet: string;
  chainId: ChainId;
  action: ActionCreate<E, C>;
  hash: string;
  meta?: LocalMetadata;
}

export interface CancelActionRpc {
  actionDeleteKey: string;
}

// What's stored in the db.
export interface ActionEntityJson extends BaseJson {
  action: ActionCreate<any, any>;
  block: number;
  chainId: ChainId;
  errors?: ErrorCode[];
  hash: string;
  nonce: string;
  originalTargetId: string;
  pendingId: string;
  proxyWallet?: string;
  time: number;
  txn: number;
  signedTxn?: BufferJson;
  meta?: LocalMetadata;
}

export interface ActionDeleteKeyJson extends BaseJson {
  uuid: string;
  expires: string; // Hex of expires timestamp (in case we want to index later for clean-ups)
}

export type ActionLog = Log & ActionEntityJson;

export type MergedActionLog = ActionLog & CrawledLog;

export interface ActionMap {
  [actionId: string]: ActionEntityJson;
}
