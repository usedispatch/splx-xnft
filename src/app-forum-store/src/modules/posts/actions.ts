import { ModulePostsActions, ThisPosts as This } from './types';

import { ModuleAction } from '@dispatch-services/store';
import { isEmpty } from '@dispatch-services/utils-common/json';
import { useActions } from '../actions';
import { useApi } from '../api';

const createPost: ModuleAction<This> = async function (body: string, parentId: string) {
  await useActions.actions.post(this.getters.getCreatePostActionCreateInput(body, parentId));
};

const deletePost: ModuleAction<This> = async function (postId: string) {
  await useActions.actions.post(this.getters.getDeletePostActionCreateInput(postId));
};

const editPost: ModuleAction<This> = async function (body: string, postId: string) {
  const editPostAction = this.getters.getEditPostActionCreateInput(body, postId);
  if (isEmpty(editPostAction.params)) {
    return;
  }
  await useActions.actions.post(editPostAction);
};

const pinPost: ModuleAction<This> = async function (pinned: boolean, postId: string) {
  const pinPostAction = this.getters.getPinPostEditActionCreateInput(pinned, postId);
  if (isEmpty(pinPostAction.params)) {
    return;
  }
  await useActions.actions.post(pinPostAction);
};

const fetchNewestPostsForTopic: ModuleAction<This> = async function (
  forumActionId: string,
  topicActionId: string,
  userId?: string
) {
  const config = this.getters.getPostsConfig(forumActionId, topicActionId);
  const actionKey = useApi.getters.getActionKey(config);
  await useApi.actions.get(config, actionKey);
};

export const actions: ModulePostsActions = {
  createPost,
  deletePost,
  editPost,
  pinPost,
  fetchNewestPostsForTopic,
};
