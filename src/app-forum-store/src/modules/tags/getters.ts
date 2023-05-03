import { ApiRequestConfig, useApi } from '../api';
import { ModuleTagsGetters, ThisTags as This } from './types';
import { TagActionParams, TagJson } from '@dispatch-services/db-forum-common/actions';
import { TagType, generateTagId, parseTagId } from '@dispatch-services/db-forum-common/entities';

import { ModuleGetter } from '@dispatch-services/store';
import { useEntities } from '../entities';

const fetchTagsConfig: ModuleGetter<This> = function () {
  return () => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/tags',
    };
    return config;
  };
};

const getTags: ModuleGetter<This> = function () {
  return (tagType?: TagType) => {
    const tagsConfig = this.getters.fetchTagsConfig();
    const tags = useApi.getters.getResponse(tagsConfig);

    return tagType ? tags.filter((tag) => parseTagId(tag.id).tagType === tagType) : tags;
  };
};

const getTagActionParams: ModuleGetter<This> = function () {
  return (tagType: TagType, displayName: string) => {
    const tagActionParams = {
      tagType,
      displayName: displayName.toLowerCase(),
    };
    return tagActionParams;
  };
};

const getTagActionParamsFromId: ModuleGetter<This> = function () {
  return (tagId: string) => {
    const parsedTagId = parseTagId(tagId);
    const tag = useEntities.getters.getEntity(tagId) as TagJson;
    const tagActionParams = {
      tagType: parsedTagId.tagType,
      displayName: tag?.name,
    };
    return tagActionParams;
  };
};

const isProductTag: ModuleGetter<This> = function () {
  return (tag: TagJson) => {
    return parseTagId(tag.id).tagType === TagType.Product;
  };
};

const tagParamToId: ModuleGetter<This> = function () {
  return (tagParam: TagActionParams) => {
    return generateTagId(tagParam.displayName.toLowerCase(), tagParam.tagType);
  };
};

export const getters: ModuleTagsGetters = {
  fetchTagsConfig,
  getTags,
  getTagActionParams,
  getTagActionParamsFromId,
  isProductTag,
  tagParamToId,
};
