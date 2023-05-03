import { Media, TagActionParams } from '@dispatch-services/db-forum-common/actions';
import { ModuleProductTopicsActions, ThisProductTopics as This } from './types';

import { EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleAction } from '@dispatch-services/store';
import { isEmpty } from '@dispatch-services/utils-common/json';
import { useActions } from '../actions';
import { useApi } from '../api';
import { useApp } from '../app';
import { useEntities } from '../entities';

const createProductTopic: ModuleAction<This> = async function (
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
) {
  const forumId = useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Forum) as string;
  const actionCreateInput = this.getters.getCreateProductTopicActionCreateInput(
    title,
    body,
    subtitle,
    url,
    image,
    mentions,
    tags,
    media,
    programId,
    forumId
  );
  await useActions.actions.post(actionCreateInput);
  const err = useActions.getters.postError(actionCreateInput);
  if (!err) {
    await useApp.actions.redirect(actionCreateInput);
  }
};

const deleteProductTopic: ModuleAction<This> = async function (topicActionId: string) {
  const topicId = useEntities.getters.getEntityIdFromActionId(topicActionId, EntityType.ProductTopic) as string;
  await useActions.actions.post(this.getters.getDeleteProductTopicActionCreateInput(topicId));
};

const editProductTopic: ModuleAction<This> = async function (
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
) {
  const editAction = this.getters.getEditProductTopicActionCreateInput(
    title,
    body,
    subtitle,
    url,
    image,
    mentions,
    tags,
    media,
    programId,
    topicId
  );
  if (isEmpty(editAction.params)) {
    return;
  }
  await useActions.actions.post(editAction);
  const err = useActions.getters.postError(editAction);
  if (!err) {
    await useApp.actions.redirect(editAction);
  }
};

const getProductLeaderboard: ModuleAction<This> = async function (creatorId?: string) {
  const res = this.getters.getProductLeaderboardRequestConfig(creatorId);
  return await useApi.actions.get(res);
};

const pinProductTopic: ModuleAction<This> = async function (pinned: boolean, topicId: string) {
  const pinPostAction = this.getters.getPinProductTopicEditActionCreateInput(pinned, topicId);
  if (isEmpty(pinPostAction.params)) {
    return;
  }
  await useActions.actions.post(pinPostAction);
};

export const actions: ModuleProductTopicsActions = {
  createProductTopic,
  deleteProductTopic,
  editProductTopic,
  getProductLeaderboard,
  pinProductTopic,
};
