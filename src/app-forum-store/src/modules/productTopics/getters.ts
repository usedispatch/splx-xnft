import {
  ActionCreateInput,
  ActionParams,
  CountJson,
  Crud,
  Media,
  PostboxJson,
  ProductTopicJson,
  TagActionParams,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '../api';
import {
  EntityJson,
  EntityType,
  PostboxEntityJson,
  generateCountId,
  getActionIdFromOptimisticActionId,
  getTypeFromId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleProductTopicsGetters, ThisProductTopics as This } from './types';
import { hexToNum, normalizeTwitter } from '@dispatch-services/utils-common/string';

import { ModuleGetter } from '@dispatch-services/store';
import { getChainIdFromEnv } from '@dispatch-services/db-forum-common/chain';
import { sortTopicsByVotes } from '@dispatch-services/db-forum-common/sort';
import { useActions } from '../actions';
import { useCounts } from '../counts';
import { useEntities } from '../entities';
import { useLocalState } from '../local_state';
import { usePosts } from '../posts';
import { useTopics } from '../topic';
import { useUser } from '../user';
import { useUserProfile } from '../user_profile';

const getCreateProductTopicActionCreateInput: ModuleGetter<This> = function () {
  return (
    title: string,
    body: string,
    subtitle: string,
    url: string,
    image: string,
    mentions: string[],
    tags: TagActionParams[],
    media: Media[],
    programId: string,
    forumId: string
  ) => {
    const topicBody: ActionCreateInput<EntityType.ProductTopic, Crud.Post> = {
      crud: Crud.Post,
      type: EntityType.ProductTopic,
      parentId: forumId,
      params: { title, body, subtitle, url, image, mentions, media, programId, tags },
    };

    return topicBody;
  };
};

const getDeleteProductTopicActionCreateInput: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const topicBody: ActionCreateInput<EntityType.ProductTopic, Crud.Delete> = {
      crud: Crud.Delete,
      type: EntityType.ProductTopic,
      crudEntityId: topicId,
      params: {},
    };
    return topicBody;
  };
};

const getDisplayParams: ModuleGetter<This> = function () {
  return (entityJson: ProductTopicJson) => {
    // TODO(zfaizal2, partyman): why does this have to by any
    const title = useEntities.getters.getEntityParam(entityJson, 'title' as any);
    const body = useEntities.getters.getEntityParam(entityJson, 'body' as any);
    const subtitle = useEntities.getters.getEntityParam(entityJson, 'subtitle' as any);
    const url = useEntities.getters.getEntityParam(entityJson, 'url' as any);
    const image = useEntities.getters.getEntityParam(entityJson, 'image' as any);
    const mentions = useEntities.getters.getEntityParam(entityJson, 'mentions' as any);
    const tags = useEntities.getters.getEntityParam(entityJson, 'tags' as any);
    const media = useEntities.getters.getEntityParam(entityJson, 'media' as any);
    const programId = useEntities.getters.getEntityParam(entityJson, 'programId' as any);
    return { title, body, subtitle, url, image, mentions, tags, media, programId };
  };
};

const getEditProductTopicActionCreateInput: ModuleGetter<This> = function () {
  return (
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
  ) => {
    const topic = useEntities.getters.getEntity(topicId) as ProductTopicJson;
    const editedTitle = topic.title !== title ? title : undefined;
    const editedBody = topic.body !== body ? body : undefined;
    const editedSubtitle = topic.subtitle !== subtitle ? subtitle : undefined;
    const editedUrl = topic.url !== url ? url : undefined;
    const editedImage = topic.image !== image ? image : undefined;
    const editedMentions = topic.mentions !== mentions ? mentions : undefined;
    const editedTags = topic.tags !== tags ? tags : undefined;
    const editedMedia = topic.media !== media ? media : undefined;
    const editedProgramId = topic.programId !== programId ? programId : undefined;
    // tags input as default as list is always set on edit
    const params: ActionParams<EntityType.ProductTopic> = { tags };
    if (editedTitle) {
      params.title = editedTitle;
    }
    if (editedBody) {
      params.body = editedBody;
    }
    if (editedSubtitle) {
      params.subtitle = editedSubtitle;
    }
    if (editedUrl) {
      params.url = editedUrl;
    }
    if (editedImage) {
      params.image = editedImage;
    }
    if (editedMentions) {
      params.mentions = editedMentions;
    }
    if (editedTags) {
      params.tags = editedTags;
    }
    if (editedMedia) {
      params.media = editedMedia;
    }
    if (editedProgramId) {
      params.programId = editedProgramId;
    }
    const topicBody: ActionCreateInput<EntityType.ProductTopic, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.ProductTopic,
      crudEntityId: topicId,
      params,
    };
    return topicBody;
  };
};

const getMentions: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const topic = useEntities.getters.getEntity(topicId) as ProductTopicJson;
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return topic.mentions.map((mention) => normalizeTwitter(mention));
  };
};

const getNewestProductTopicsForForum: ModuleGetter<This> = function () {
  return (forumActionId: string, tagIds?: string[]) => {
    const topicConfig = useTopics.getters.getTopicsConfig(forumActionId, false);
    const forumId = useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Forum);
    const pins = (usePosts.getters.getPinnedPosts(forumId ?? '') ?? []).filter(
      (post) => getTypeFromId(post.id) === EntityType.ProductTopic
    );
    let entities = useApi.getters.getResponse(topicConfig);
    if (!entities.length && useUser.computed.userId) {
      entities = useApi.getters.getResponse(useTopics.getters.getTopicsConfig(forumActionId, true));
    }
    const productTopics = useEntities.getters.getEntitiesWithPending(
      entities,
      EntityType.ProductTopic,
      forumId
    ) as Array<EntityJson<EntityType.ProductTopic>>;
    const topics = productTopics.reduce<PostboxEntityJson[]>((acc, curr) => {
      if (!useEntities.getters.isDeletedEntity(curr)) {
        acc.push(curr);
      }
      return acc;
    }, []);
    topics.unshift(...pins);
    return topics;
  };
};

const getSortedTopics: ModuleGetter<This> = function () {
  return (topics: ProductTopicJson[], sortOptions: 'relevance' | 'recent' | 'popular', topicType?: EntityType) => {
    if (topics.length < 2) {
      return topics;
    }
    const filteredTopics = topicType ? topics.filter((topic) => getTypeFromId(topic.id) === topicType) : topics;
    const pins = topicType
      ? ((usePosts.getters.getPinnedPosts(filteredTopics[0]?.parentId ?? '') ?? []).filter(
          (post) => getTypeFromId(post.id) === topicType
        ) as Array<PostboxJson & { currentVotes: number }>)
      : [];
    if (sortOptions === 'relevance') {
      filteredTopics.unshift(...pins);
      return filteredTopics;
    }
    if (sortOptions === 'recent') {
      const recentTopics = filteredTopics.sort((a, b) => hexToNum(b.blockOrder) - hexToNum(a.blockOrder));
      filteredTopics.unshift(...pins);
      return recentTopics;
    }
    // if the topics have the same amount of votes, then they should by sorted by recent
    if (filteredTopics.length > 0) {
      const topicsWithVotes = filteredTopics.map((t) => {
        const u = useCounts.getters.getCount(t, 'upVotes');
        const d = useCounts.getters.getCount(t, 'downVotes');

        return { ...t, currentVotes: u - d };
      });

      const popularTopics = sortTopicsByVotes(topicsWithVotes);
      popularTopics.unshift(...pins);
      return popularTopics;
    }
    filteredTopics.unshift(...pins);
    return filteredTopics;
  };
};

const getPendingProductTopicId: ModuleGetter<This> = function () {
  return (topicActionCreateInput: ActionCreateInput<EntityType.ProductTopic, Crud.Post>) => {
    const composedId = useActions.getters.getComposedIdFromCreateActionInput(
      topicActionCreateInput,
      EntityType.ProductTopic,
      Crud.Post
    );
    const pending = useLocalState.getters.getPendingIdOfType(composedId);
    return getActionIdFromOptimisticActionId(pending.actionId);
  };
};

const getPendingProductTopicsForForum: ModuleGetter<This> = function () {
  return (forumId: string) => {
    const topics = !forumId ? [] : useEntities.getters.getPendingEntities(EntityType.ProductTopic, forumId);
    return topics;
  };
};

const getPinProductTopicEditActionCreateInput: ModuleGetter<This> = function () {
  return (pinned: boolean, topicId: string) => {
    const params: ActionParams<EntityType.ProductTopic> = {
      pin: pinned,
    };
    const postBody: ActionCreateInput<EntityType.ProductTopic, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.ProductTopic,
      crudEntityId: topicId,
      params,
    };
    return postBody;
  };
};

const getProductLeaderboardRequestConfig: ModuleGetter<This> = function () {
  return (creatorId?: string) => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      method: 'get',
      url: '/leaderboard/products/score',
      params: {
        creatorId,
      },
    };
    return config;
  };
};

const getProductLeaderboardResponse: ModuleGetter<This> = function () {
  return () => {
    const config = this.getters.getProductLeaderboardRequestConfig();
    const response = useApi.getters.getResponse(config);
    return response;
  };
};

const getProductScore: ModuleGetter<This> = function () {
  return (topicId: string): number => {
    const countId = generateCountId(topicId, getChainIdFromEnv(process.env.ACTIVE_CHAIN as string));
    return (useEntities.getters.getEntity(countId) as CountJson | undefined)?.score ?? 0;
  };
};

const getTagsForProductTopic: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const topic = useEntities.getters.getEntity(topicId) as ProductTopicJson;
    const tags = useEntities.getters.getEntityParam(topic, 'tags');
    return tags;
  };
};

const getTweetTemplate: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const topic = useEntities.getters.getEntity(topicId) as ProductTopicJson;
    const twitterMentionsList = this.getters.getMentions(topicId);
    const twitterMentionsMessage = twitterMentionsList.map((mention) => `@${mention}`).join(' ');
    const userId = useUser.computed.userId;
    const userProfile = useUserProfile.getters.getUserProfile(userId);
    const displayInfo = userProfile && useUserProfile.getters.getProfileDisplayParams(userProfile);
    let twitterMessage: string = `i just found the ${
      getTypeFromId(topic.id) === EntityType.ProductTopic ? 'product' : 'topicxz'
    } ${topic?.title} on @solarplex_xyz! cool product! ${twitterMentionsMessage} `;
    if (displayInfo?.type === 'twitter' && twitterMentionsList.includes(displayInfo?.displayName)) {
      twitterMessage = `${topic.title} is being Showcased in @solarplex_xyz, come upvote it ${
        getTypeFromId(topic.id) === EntityType.ProductTopic ? 'and give us feedback to earn rewards' : ''
      }!`;
    } else if (userId === topic?.creatorId) {
      twitterMessage = `i just showcased ${topic.title} on @solarplex_xyz! hey ${twitterMentionsMessage} - come claim your product page to see user feedback and register for awards!`;
    }
    return twitterMessage;
  };
};

const isBuilder: ModuleGetter<This> = function () {
  return (topicId: string) => {
    const userId = useUser.computed.userId;
    const userProfile = useUserProfile.getters.getUserProfile(userId);
    const userDisplayParams = userProfile && useUserProfile.getters.getProfileDisplayParams(userProfile);
    const twitterMentions = this.getters.getMentions(topicId);
    return userDisplayParams ? twitterMentions.includes(normalizeTwitter(userDisplayParams.displayName)) : false;
  };
};

export const getters: ModuleProductTopicsGetters = {
  getCreateProductTopicActionCreateInput,
  getDeleteProductTopicActionCreateInput,
  getDisplayParams,
  getEditProductTopicActionCreateInput,
  getMentions,
  getNewestProductTopicsForForum,
  getPendingProductTopicId,
  getPendingProductTopicsForForum,
  getPinProductTopicEditActionCreateInput,
  getSortedTopics,
  getProductLeaderboardRequestConfig,
  getProductLeaderboardResponse,
  getProductScore,
  getTagsForProductTopic,
  getTweetTemplate,
  isBuilder,
};
