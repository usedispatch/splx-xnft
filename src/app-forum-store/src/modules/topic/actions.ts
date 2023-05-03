import { ModuleTopicsActions, ThisTopics as This } from './types';

import { EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleAction } from '@dispatch-services/store';
import { isEmpty } from '@dispatch-services/utils-common/json';
import { useActions } from '../actions';
import { useApi } from '../api';
import { useApp } from '../app';
import { useEntities } from '../entities';

const createTopic: ModuleAction<This> = async function (
  title: string,
  body: string,
  forumActionId: string,
  url?: string
) {
  const forumId = useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Forum) as string;
  const actionCreateInput = this.getters.getCreateTopicActionCreateInput(title, body, forumId, url);
  await useActions.actions.post(actionCreateInput);
  const err = useActions.getters.postError(actionCreateInput);
  if (!err) {
    await useApp.actions.redirect(actionCreateInput);
  }
};

const deleteTopic: ModuleAction<This> = async function (topicActionId: string) {
  const topicId = useEntities.getters.getEntityIdFromActionId(topicActionId, EntityType.Topic) as string;
  await useActions.actions.post(this.getters.getDeleteTopicActionCreateInput(topicId));
};

const editTopic: ModuleAction<This> = async function (title: string, body: string, topicId: string) {
  const editAction = this.getters.getEditTopicActionCreateInput(topicId, title, body);
  if (isEmpty(editAction.params)) {
    return;
  }
  await useActions.actions.post(editAction);
  const err = useActions.getters.postError(editAction);
  if (!err) {
    await useApp.actions.redirect(editAction);
  }
};

const fetchNewestTopicsForForum: ModuleAction<This> = async function (
  forumActionId: string,
  creatorId?: string,
  tagId?: string
) {
  const topicsRequest = this.getters.getTopicsConfig(forumActionId, false, tagId);
  const actionKey = useApi.getters.getActionKey(topicsRequest);
  await useApi.actions.get(topicsRequest, actionKey);
};

const fetchTopic: ModuleAction<This> = async function (forumActionId: string, topicActionId: string) {
  const topicRequest = this.getters.getTopicConfig(forumActionId, topicActionId);
  const actionKey = useApi.getters.getActionKey(topicRequest);
  await useApi.actions.get(topicRequest, actionKey);
};

const pinTopic: ModuleAction<This> = async function (pinned: boolean, topicId: string) {
  const pinPostAction = this.getters.getPinTopicEditActionCreateInput(pinned, topicId);
  if (isEmpty(pinPostAction.params)) {
    return;
  }
  await useActions.actions.post(pinPostAction);
};

export const actions: ModuleTopicsActions = {
  createTopic,
  deleteTopic,
  editTopic,
  fetchNewestTopicsForForum,
  fetchTopic,
  pinTopic,
};
