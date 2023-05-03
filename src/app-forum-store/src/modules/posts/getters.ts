import {
  ActionCreateInput,
  ActionParams,
  Crud,
  PostJson,
  PostboxJson,
  ProductTopicJson,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '../api';
import {
  EntityJson,
  EntityType,
  getActionIdFromOptimisticActionId,
  getParentIdFromId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleGetter, useTime } from '@dispatch-services/store';
import { ModulePostsGetters, ThisPosts as This } from './types';

import { sortByDepthAndTime } from '@dispatch-services/db-forum-common/sort';
import { useCounts } from '../counts';
import { useEntities } from '../entities';
import { useProductTopics } from '../productTopics';
import { useUser } from '../user';

const getCreatePostActionCreateInput: ModuleGetter<This> = function () {
  return (body: string, parentId: string) => {
    const postBody: ActionCreateInput<EntityType.Post, Crud.Post> = {
      crud: Crud.Post,
      type: EntityType.Post,
      parentId,
      params: { body },
    };
    return postBody;
  };
};

const getDeletePostActionCreateInput: ModuleGetter<This> = function () {
  return (postId: string) => {
    const postBody: ActionCreateInput<EntityType.Post, Crud.Delete> = {
      crud: Crud.Delete,
      type: EntityType.Post,
      crudEntityId: postId,
    };
    return postBody;
  };
};

const getDisplayParams: ModuleGetter<This> = function () {
  return (entityJson: PostJson) => {
    // TODO(zfaizal2, partyman): why does this have to by any
    const body = useEntities.getters.getEntityParam(entityJson, 'body' as any);
    return { body };
  };
};

const getEditPostActionCreateInput: ModuleGetter<This> = function () {
  return (body: string, postId: string) => {
    const post = useEntities.getters.getEntity(postId) as PostJson;
    const editedBody = post.body !== body ? body : undefined;
    const params: ActionParams<EntityType.Post> = {};
    if (editedBody) {
      params.body = editedBody;
    }
    const postBody: ActionCreateInput<EntityType.Post, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Post,
      crudEntityId: postId,
      params,
    };
    return postBody;
  };
};

const getPinPostEditActionCreateInput: ModuleGetter<This> = function () {
  return (pinned: boolean, postId: string) => {
    const params: ActionParams<EntityType.Post> = {
      pin: pinned,
    };
    const postBody: ActionCreateInput<EntityType.Post, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Post,
      crudEntityId: postId,
      params,
    };
    return postBody;
  };
};

const getFormattedDateForPost: ModuleGetter<This> = function () {
  return (post: PostJson) => {
    return useTime.getters.getDateAge(post.time);
  };
};

const getPostsConfig: ModuleGetter<This> = function () {
  return (forumActionId: string, topicActionId: string, ignoreCreatorId: boolean = false): ApiRequestConfig => {
    forumActionId = getActionIdFromOptimisticActionId(forumActionId);
    topicActionId = getActionIdFromOptimisticActionId(topicActionId);
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/forum/:forumActionId/topic/:topicActionId/posts',
      subDirectories: {
        forumActionId,
        topicActionId,
      },
    };
    const creatorId = ignoreCreatorId ? '' : useUser.computed.userId;
    if (creatorId) {
      config.params = {
        creatorId,
      };
    }
    return config;
  };
};

const getNewestPostsForTopic: ModuleGetter<This> = function () {
  return (forumActionId: string, topicActionId: string) => {
    const postsConfig = this.getters.getPostsConfig(forumActionId, topicActionId);
    let entities = useApi.getters.getResponse(postsConfig);
    if (!entities.length && useUser.computed.userId) {
      entities = useApi.getters.getResponse(this.getters.getPostsConfig(forumActionId, topicActionId, true));
    }
    const topicId = useEntities.getters.getEntityIdFromActionId(topicActionId, EntityType.Topic);
    const productId = useEntities.getters.getEntityIdFromActionId(topicActionId, EntityType.ProductTopic);
    const pins = this.getters.getPinnedPosts(topicId ?? productId ?? '') ?? [];
    const posts = useEntities.getters.getEntitiesWithPending(entities, EntityType.Post, topicId ?? productId) as Array<
      EntityJson<EntityType.Post>
    >;
    const sortedPosts = sortByDepthAndTime(posts, 'desc').filter((p) => !pins.includes(p));
    sortedPosts.unshift(...pins);
    return sortedPosts;
  };
};

const getPopularPostsForTopic: ModuleGetter<This> = function () {
  return (forumActionId: string, topicActionId: string) => {
    const posts = this.getters.getNewestPostsForTopic(forumActionId, topicActionId);
    if (posts.length > 0) {
      const postsWithVotes = posts.map((p) => {
        const u = useCounts.getters.getCount(p, 'upVotes');
        const d = useCounts.getters.getCount(p, 'downVotes');

        return { ...p, currentVotes: u - d };
      });

      const sorted = postsWithVotes.sort((a, b) => b.currentVotes - a.currentVotes);

      // remove the 'curentVotes' field from the result to match PostJson type
      return sorted.map((p) => {
        const { currentVotes, ...postJsonFields } = p;
        return { ...postJsonFields };
      });
    }
  };
};

const getPendingPostsForTopic: ModuleGetter<This> = function () {
  return (topicActionId: string) => {
    const topicId = useEntities.getters.getEntityIdFromActionId(topicActionId, EntityType.Topic);
    const posts = !topicId
      ? []
      : (useEntities.getters.getPendingEntities(EntityType.Post, topicId) as Array<EntityJson<EntityType.Post>>);
    return posts;
  };
};

const getTweetTemplate: ModuleGetter<This> = function () {
  return (postId: string) => {
    const post = useEntities.getters.getEntity(postId) as PostJson;
    const topic = useEntities.getters.getEntity(post.parentId) as ProductTopicJson;
    const twitterMentionsList = useProductTopics.getters
      .getMentions(topic.id)
      .map((mention) => `@${mention}`)
      .join(' ');
    const userId = useUser.computed.userId;
    return `${userId === post.creatorId ? 'i just gave' : 'checkout the'} feedback to ${
      topic.title
    } on @solarplex_xyz! come upvote the product and feedback so ${twitterMentionsList} can see it!`;
  };
};

const getPinnedPosts: ModuleGetter<This> = function () {
  return (parentId: string) => {
    if (!parentId) return;
    const topic = useEntities.getters.getEntity(parentId) as PostboxJson;
    const editedPins = (useEntities.getters.getPendingEdit(parentId)?.properties as ProductTopicJson)?.pins;
    const entities = useEntities.getters.getEntity(editedPins || topic.pins);
    return entities;
  };
};

const isPinned: ModuleGetter<This> = function () {
  return (postId: string) => {
    const parentId = getParentIdFromId(postId);
    return !!this.getters.getPinnedPosts(parentId).find((i) => i.id === postId);
  };
};

const isDeletedPost: ModuleGetter<This> = function () {
  return (post: PostJson) => {
    return useEntities.getters.isDeletedEntity(post);
  };
};

export const getters: ModulePostsGetters = {
  getCreatePostActionCreateInput,
  getDeletePostActionCreateInput,
  getDisplayParams,
  getEditPostActionCreateInput,
  getFormattedDateForPost,
  getNewestPostsForTopic,
  getPopularPostsForTopic,
  getPendingPostsForTopic,
  getPinPostEditActionCreateInput,
  getPostsConfig,
  getPinnedPosts,
  getTweetTemplate,
  isPinned,
  isDeletedPost,
};
