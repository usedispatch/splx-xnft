import { ActionCreateInput, Crud, PostJson, PostboxJson } from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisPosts = ModuleApi<ModulePostsState, ModulePostsComputed, ModulePostsGetters, ModulePostsActions>;
// type This = ThisPosts;

export interface PostDisplayParams {
  body: string;
}

export interface ModulePostsState {
  example: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModulePostsComputed {}

export interface ModulePostsGetters {
  // use the `depth` property to establish post level/hierarchy
  getCreatePostActionCreateInput: () => (
    body: string,
    parentId: string
  ) => ActionCreateInput<EntityType.Post, Crud.Post>;
  getDeletePostActionCreateInput: () => (postId: string) => ActionCreateInput<EntityType.Post, Crud.Delete>;
  getDisplayParams: () => (entityJson: PostJson) => PostDisplayParams;
  getEditPostActionCreateInput: () => (body: string, postId: string) => ActionCreateInput<EntityType.Post, Crud.Put>;
  getFormattedDateForPost: () => (post: PostJson) => string;
  getNewestPostsForTopic: () => (forumActionId: string, topicActionId: string) => PostJson[];
  getPopularPostsForTopic: () => (forumActionId: string, topicActionId: string) => PostJson[];
  getPendingPostsForTopic: () => (topicId: string) => Array<EntityJson<EntityType.Post>>;
  getPinPostEditActionCreateInput: () => (
    pinned: boolean,
    postId: string
  ) => ActionCreateInput<EntityType.Post, Crud.Put>;
  getPinnedPosts: () => (topicId: string) => PostboxJson[];
  getPostsConfig: () => (forumActionId: string, topicActionId: string, ignoreCreatorId?: boolean) => ApiRequestConfig;
  getTweetTemplate: () => (postId: string) => string;
  isPinned: () => (postId: string) => boolean;
  isDeletedPost: () => (post: PostJson) => boolean;
}

export interface ModulePostsActions {
  // Interface used for all levels of posts, replies, subreplies, etc
  // simply change the parentId to the appropriate post level
  createPost: (this: ThisPosts, body: string, parentId: string) => Promise<void>;
  deletePost: (this: ThisPosts, postId: string) => Promise<void>;
  editPost: (this: ThisPosts, body: string, postId: string) => Promise<void>;
  pinPost: (this: ThisPosts, pinned: boolean, postId: string) => Promise<void>;
  fetchNewestPostsForTopic: (
    this: ThisPosts,
    forumActionId: string,
    topicActionId: string,
    userId?: string
  ) => Promise<void>;
}
