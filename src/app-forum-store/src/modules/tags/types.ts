import { TagActionParams, TagJson } from '@dispatch-services/db-forum-common/actions';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';
import { TagType } from '@dispatch-services/db-forum-common/entities';

export type ThisTags = ModuleApi<ModuleTagsState, ModuleTagsComputed, ModuleTagsGetters, ModuleTagsActions>;
type This = ThisTags;

export interface ModuleTagsState {
  example: number;
}

export interface ModuleTagsComputed {
  tagOptions: () => string[];
}

export interface ModuleTagsGetters {
  fetchTagsConfig: () => () => ApiRequestConfig;
  getTags: () => (tagType?: TagType) => TagJson[];
  getTagActionParams: () => (tagType: TagType, displayName: string) => TagActionParams;
  getTagActionParamsFromId: () => (tagId: string) => TagActionParams;
  isProductTag: () => (tag: TagJson) => boolean;
  tagParamToId: () => (tagParam: TagActionParams) => string;
}

export interface ModuleTagsActions {
  fetchTags: (this: This) => Promise<void>;
}
