import { ModuleForumsActions, ThisForums as This } from './types';

import { ModuleAction } from '@dispatch-services/store';
import { useActions } from '../actions';
import { useApi } from '../api';
import { useApp } from '../app';

const createForum: ModuleAction<This> = async function (title: string, body: string) {
  const forumBody = this.getters.getCreateForumActionCreateInput(title, body);
  await useActions.actions.post(forumBody);
  const err = useActions.getters.postError(forumBody);
  if (!err) {
    await useApp.actions.redirect(forumBody);
  }
};

const getNewestForums: ModuleAction<This> = async function () {
  const newestRequest = this.getters.getNewestForumsConfig();
  await useApi.actions.get(newestRequest);
};

const getForum: ModuleAction<This> = async function (forumActionId: string) {
  const forumRequest = this.getters.getForumConfig(forumActionId);
  await useApi.actions.get(forumRequest);
};

export const actions: ModuleForumsActions = {
  createForum,
  getNewestForums,
  getForum,
};
