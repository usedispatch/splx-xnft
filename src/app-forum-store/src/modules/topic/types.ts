import { ActionCreateInput, Crud, TopicJson } from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisTopics = ModuleApi<ModuleTopicsState, ModuleTopicsComputed, ModuleTopicsGetters, ModuleTopicsActions>;
type This = ThisTopics;

export interface ModuleTopicsState {
  example: number;
}

export interface TopicDisplayParams {
  title: string;
  body: string;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleTopicsComputed {}

export interface ModuleTopicsGetters {
  getCreateTopicActionCreateInput: () => (
    title: string,
    body: string,
    parentId: string,
    url?: string
  ) => ActionCreateInput<EntityType.Topic, Crud.Post>;
  getDeleteTopicActionCreateInput: () => (topicId: string) => ActionCreateInput<EntityType.Topic, Crud.Delete>;
  getDisplayParams: () => (entityJson: TopicJson) => TopicDisplayParams;
  getEditTopicActionCreateInput: () => (
    topicId: string,
    title: string,
    body: string
  ) => ActionCreateInput<EntityType.Topic, Crud.Put>;
  getFormattedDateForTopic: () => (topic: TopicJson) => string;
  getNewestTopicsForForum: () => (forumActionId: string) => TopicJson[];
  getPopularTopicsForForum: () => (forumActionId: string) => TopicJson[];
  getPendingTopicForForum: () => (title: string, body: string, forumActionId: string) => TopicJson;
  getPendingTopicsForForum: () => (forumId: string) => Array<EntityJson<EntityType.Topic>>;
  getPendingTopicId: () => (topicActionCreateInput: ActionCreateInput<EntityType.Topic, Crud.Post>) => string;
  getPinTopicEditActionCreateInput: () => (
    pinned: boolean,
    topicId: string
  ) => ActionCreateInput<EntityType.Topic, Crud.Put>;
  getTopicsConfig: () => (forumActionId: string, ignoreCreatorId?: boolean, tagId?: string) => ApiRequestConfig;
  getTopicConfig: () => (forumActionId: string, topicActionId: string, ignoreCreatorId?: boolean) => ApiRequestConfig;
  getTopic: () => (topicforumActionIdId: string) => TopicJson;
  isDeletedTopic: () => (topic: TopicJson) => boolean;
}

export interface ModuleTopicsActions {
  createTopic: (this: This, title: string, body: string, forumActionId: string, url?: string) => Promise<void>;
  deleteTopic: (this: This, topicActionId: string) => Promise<void>;
  editTopic: (this: This, title: string, body: string, topicId: string, url?: string) => Promise<void>;
  fetchNewestTopicsForForum: (this: This, forumActionId: string, creatorId?: string, tagId?: string) => Promise<void>;
  fetchTopic: (this: This, forumActionId: string, topicActionId: string) => Promise<void>;
  pinTopic: (this: This, pinned: boolean, topicId: string) => Promise<void>;
}
