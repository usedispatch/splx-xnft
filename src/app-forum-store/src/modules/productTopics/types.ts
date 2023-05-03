import {
  ActionCreateInput,
  BaseJson,
  Crud,
  Media,
  ProductTopicJson,
  TagActionParams,
} from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisProductTopics = ModuleApi<
  ModuleProductTopicsState,
  ModuleProductTopicsComputed,
  ModuleProductTopicsGetters,
  ModuleProductTopicsActions
>;
type This = ThisProductTopics;

export interface ProductTopicInterface {
  title: string;
  body: string;
  subtitle: string;
  url: string;
  image: string;
  mentions: string[];
  tags: TagActionParams[];
  media: Media[];
  programId: string;
}
export interface ModuleProductTopicsState {
  example: number;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleProductTopicsComputed {}

export interface ModuleProductTopicsGetters {
  getCreateProductTopicActionCreateInput: () => (
    title: string,
    body: string,
    subtitle: string,
    url: string,
    image: string,
    mentions: string[],
    tags: TagActionParams[],
    media: Media[],
    programId: string,
    parentId: string
  ) => ActionCreateInput<EntityType.ProductTopic, Crud.Post>;
  getDeleteProductTopicActionCreateInput: () => (
    topicActionId: string
  ) => ActionCreateInput<EntityType.ProductTopic, Crud.Delete>;
  getDisplayParams: () => (entityJson: ProductTopicJson) => ProductTopicInterface;
  getEditProductTopicActionCreateInput: () => (
    title: string,
    body: string,
    subtitle: string,
    url: string,
    image: string,
    mentions: string[],
    tags: TagActionParams[],
    media: Media[],
    programId: string,
    topicId: string
  ) => ActionCreateInput<EntityType.ProductTopic, Crud.Put>;
  getMentions: () => (topicId: string) => string[];
  getNewestProductTopicsForForum: () => (forumActionId: string, tagIds?: string[]) => ProductTopicJson[];
  getSortedTopics: () => (
    topics: ProductTopicJson[],
    sortOptions: 'recent' | 'popular' | 'relevance',
    topicType?: EntityType
  ) => ProductTopicJson[];
  getPendingProductTopicId: () => (
    topicActionCreateInput: ActionCreateInput<EntityType.ProductTopic, Crud.Post>
  ) => string;
  getPendingProductTopicsForForum: () => (forumId: string) => Array<EntityJson<EntityType.ProductTopic>>;
  getPinProductTopicEditActionCreateInput: () => (
    pinned: boolean,
    topicId: string
  ) => ActionCreateInput<EntityType.ProductTopic, Crud.Put>;
  getProductLeaderboardRequestConfig: () => (creatorId?: string) => ApiRequestConfig;
  getProductLeaderboardResponse: () => () => BaseJson[];
  getProductScore: () => (topicId: string) => number;
  getTweetTemplate: () => (topicId: string) => string;
  getTagsForProductTopic: () => (topicId: string) => TagActionParams[];
  isBuilder: () => (topicId: string) => boolean;
}

export interface ModuleProductTopicsActions {
  createProductTopic: (
    this: This,
    title: string,
    body: string,
    subtitle: string,
    url: string,
    image: string,
    mentions: string[],
    tags: TagActionParams[],
    media: Media[],
    programId: string,
    forumActionId: string
  ) => Promise<void>;
  deleteProductTopic: (this: This, topicId: string) => Promise<void>;
  editProductTopic: (
    this: This,
    title: string,
    body: string,
    subtitle: string,
    url: string,
    image: string,
    mentions: string[],
    tags: TagActionParams[],
    media: Media[],
    programId: string,
    topicId: string
  ) => Promise<void>;
  getProductLeaderboard: (this: This, creatorId?: string) => Promise<void>;
  pinProductTopic: (this: This, pinned: boolean, topicId: string) => Promise<void>;
}
