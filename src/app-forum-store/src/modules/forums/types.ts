import { ActionCreateInput, Crud, ForumJson } from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '@dispatch-services/app-forum-store/modules/api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisForums = ModuleApi<ModuleForumsState, ModuleForumsComputed, ModuleForumsGetters, ModuleForumsActions>;
type This = ThisForums;

export interface ModuleForumsState {
  example: number;
}

export interface ModuleForumsComputed {
  newestForums: () => Promise<Array<EntityJson<EntityType>>>;
}

export interface ModuleForumsGetters {
  getNewestForumsConfig: () => (ignoreCreatorId?: boolean) => ApiRequestConfig;
  getForumConfig: () => (forumActionId: string, ignoreCreatorId?: boolean) => ApiRequestConfig;
  getForum: () => (forumActionId: string) => ForumJson;
  getCreateForumActionCreateInput: () => (title: string, body: string) => any;
  getPendingForumId: () => (forumActionCreateInput: ActionCreateInput<EntityType.Forum, Crud.Post>) => string;
}

export interface ModuleForumsActions {
  createForum: (this: This, title: string, body: string) => Promise<void>;
  getNewestForums: (this: This) => Promise<void>;
  getForum: (this: This, forumActionId: string) => Promise<void>;
}
