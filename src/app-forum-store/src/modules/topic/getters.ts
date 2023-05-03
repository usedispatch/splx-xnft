import { ActionCreateInput, ActionParams, Crud, TopicJson } from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '../api';
import {
  EntityJson,
  EntityType,
  getActionIdFromOptimisticActionId,
  getTypeFromId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleGetter, useTime } from '@dispatch-services/store';
import { ModuleTopicsGetters, ThisTopics as This } from './types';
import { sortByDepthAndTime, sortTopicsByVotes } from '@dispatch-services/db-forum-common/sort';

import { useActions } from '../actions';
import { useCounts } from '../counts';
import { useEntities } from '../entities';
import { useLocalState } from '../local_state';
import { usePosts } from '../posts';
import { useUser } from '../user';

const getTopicsConfig: ModuleGetter<This> = function () {
  return (forumActionId: string, ignoreCreatorId: boolean = false, tagId?: string): ApiRequestConfig => {
    forumActionId = getActionIdFromOptimisticActionId(forumActionId);
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/forum/:forumActionId/topics',
      subDirectories: {
        forumActionId,
      },
    };
    const creatorId = ignoreCreatorId ? '' : useUser.computed.userId;
    if (creatorId) {
      config.params = {
        creatorId,
      };
    }
    if (tagId) {
      config.params = {
        ...config.params,
        tagId,
      };
    }
    return config;
  };
};

const getTopicConfig: ModuleGetter<This> = function () {
  return (forumActionId: string, topicActionId: string, ignoreCreatorId: boolean = false): ApiRequestConfig => {
    forumActionId = getActionIdFromOptimisticActionId(forumActionId);
    topicActionId = getActionIdFromOptimisticActionId(topicActionId);
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/forum/:forumActionId/topic/:topicActionId',
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

const getNewestTopicsForForum: ModuleGetter<This> = function () {
  return (forumActionId: string) => {
    const topicConfig = this.getters.getTopicsConfig(forumActionId);
    const forumId = useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Forum);
    const pins = (usePosts.getters.getPinnedPosts(forumId ?? '') ?? []).filter(
      (post) => getTypeFromId(post.id) === EntityType.Topic
    );
    // TODO(Brownmanwonders): Fix this typescript!
    let entities = useApi.getters.getResponse(topicConfig);
    if (!entities.length && useUser.computed.userId) {
      entities = useApi.getters.getResponse(this.getters.getTopicsConfig(forumActionId, true));
    }
    const topics = useEntities.getters.getEntitiesWithPending(entities, EntityType.Topic, forumId) as Array<
      EntityJson<EntityType.Topic>
    >;

    const productTopics = useEntities.getters.getEntitiesWithPending(
      entities,
      EntityType.ProductTopic,
      forumId
    ) as Array<EntityJson<EntityType.ProductTopic>>;
    const sortedTopics = sortByDepthAndTime([...productTopics, ...topics], 'desc').filter(
      (i) => !useEntities.getters.isDeletedEntity(i) && !pins.includes(i)
    );
    sortedTopics.unshift(...pins);
    return sortedTopics;
  };
};

const getPopularTopicsForForum: ModuleGetter<This> = function () {
  return (forumActionId: string) => {
    // if the topics have the same amount of votes, then they should by sorted by recent
    const topics = this.getters.getNewestTopicsForForum(forumActionId);
    if (topics.length > 0) {
      const topicsWithVotes = topics.map((t) => {
        const u = useCounts.getters.getCount(t, 'upVotes');
        const d = useCounts.getters.getCount(t, 'downVotes');

        return { ...t, currentVotes: u - d };
      });

      return sortTopicsByVotes(topicsWithVotes);
    }

    return topics;
  };
};

const getCreateTopicActionCreateInput: ModuleGetter<This> = function () {
  return (title: string, body: string, forumParentId: string, url?: string) => {
    const topicBody: ActionCreateInput<EntityType.Topic, Crud.Post> = {
      crud: Crud.Post,
      type: EntityType.Topic,
      parentId: forumParentId,
      params: { title, body, url },
    };

    return topicBody;
  };
};

const getDeleteTopicActionCreateInput: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const topicBody: ActionCreateInput<EntityType.Topic, Crud.Delete> = {
      crud: Crud.Delete,
      type: EntityType.Topic,
      crudEntityId: topicId,
      params: {},
    };
    return topicBody;
  };
};

const getEditTopicActionCreateInput: ModuleGetter<This> = function () {
  return (topicId: string, title: string, body: string) => {
    const topic = useEntities.getters.getEntity(topicId) as TopicJson;
    const editedTitle = topic.title !== title ? title : undefined;
    const editedBody = topic.body !== body ? body : undefined;
    const params: ActionParams<EntityType.Topic> = {};
    if (editedTitle) {
      params.title = editedTitle;
    }
    if (editedBody) {
      params.body = editedBody;
    }
    const topicBody: ActionCreateInput<EntityType.Topic, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Topic,
      crudEntityId: topicId,
      params,
    };
    return topicBody;
  };
};

const getDisplayParams: ModuleGetter<This> = function () {
  return (entityJson: TopicJson) => {
    // TODO(zfaizal2, partyman): why does this have to by any
    const title = useEntities.getters.getEntityParam(entityJson, 'title' as any);
    const body = useEntities.getters.getEntityParam(entityJson, 'body' as any);
    return { title, body };
  };
};

const getFormattedDateForTopic: ModuleGetter<This> = function () {
  return (topic: TopicJson) => {
    return useTime.getters.getDateAge(topic.time);
  };
};

const getPendingTopicForForum: ModuleGetter<This> = function () {
  return (title: string, body: string, forumParentId: string) => {
    const topicActionCreateInput = this.getters.getCreateTopicActionCreateInput(title, body, forumParentId);
    const composedId = useActions.getters.getComposedIdFromCreateActionInput(
      topicActionCreateInput,
      EntityType.Topic,
      Crud.Post
    );
    const actionId = useLocalState.getters.getPendingIdOfType(composedId, 'actionId') as unknown as string;
    const entityId = useEntities.getters.getEntityIdFromActionId(actionId, EntityType.Topic);
    const topic = useEntities.getters.getEntity(entityId as string);
    return topic;
  };
};

const getPinTopicEditActionCreateInput: ModuleGetter<This> = function () {
  return (pinned: boolean, topicId: string) => {
    const params: ActionParams<EntityType.Topic> = {
      pin: pinned,
    };
    const postBody: ActionCreateInput<EntityType.Topic, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Topic,
      crudEntityId: topicId,
      params,
    };
    return postBody;
  };
};

const getTopic: ModuleGetter<This> = function () {
  return (forumActionId: string) => {
    // check if topic is in store
    const fullTopicId =
      useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Topic) ??
      useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.ProductTopic);
    if (!fullTopicId) {
      return;
    }
    const topic = useEntities.getters.getEntity(fullTopicId) as TopicJson;
    return topic;
  };
};

const getPendingTopicId: ModuleGetter<This> = function () {
  return (topicActionCreateInput: ActionCreateInput<EntityType.Topic, Crud.Post>) => {
    const composedId = useActions.getters.getComposedIdFromCreateActionInput(
      topicActionCreateInput,
      EntityType.Topic,
      Crud.Post
    );
    const pending = useLocalState.getters.getPendingIdOfType(composedId);
    return getActionIdFromOptimisticActionId(pending.actionId);
  };
};

const getPendingTopicsForForum: ModuleGetter<This> = function () {
  return (forumId: string) => {
    if (!forumId) {
      return [];
    }
    const topics = useEntities.getters.getPendingEntities(EntityType.Topic, forumId) as Array<
      EntityJson<EntityType.Topic>
    >;
    return topics;
  };
};

const isDeletedTopic: ModuleGetter<This> = function () {
  return (topic: TopicJson) => {
    return useEntities.getters.isDeletedEntity(topic);
  };
};

export const getters: ModuleTopicsGetters = {
  getCreateTopicActionCreateInput,
  getDeleteTopicActionCreateInput,
  getDisplayParams,
  getEditTopicActionCreateInput,
  getFormattedDateForTopic,
  getNewestTopicsForForum,
  getPendingTopicForForum,
  getPendingTopicsForForum,
  getPendingTopicId,
  getPinTopicEditActionCreateInput,
  getTopicsConfig,
  getTopic,
  getTopicConfig,
  isDeletedTopic,
  getPopularTopicsForForum,
};
