import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleSearchGetters, ThisSearch as This } from './types';

import { Document } from 'flexsearch';
import { ModuleGetter } from '@dispatch-services/store';
import { tagsParamsToTagIds } from '@dispatch-services/db-forum-common/tags';

const getIndex: ModuleGetter<This> = function () {
  return (type: EntityType): Document<EntityJson<typeof type>> | undefined => {
    return this.state.indexes[type];
  };
};

const getSearchKey: ModuleGetter<This> = function () {
  return (searchTerm: string, tags?: string[]): string => {
    return searchTerm + (tags?.join(',') ?? '');
  };
};

const getSearchResults: ModuleGetter<This> = function () {
  return (searchTerm: string, type: EntityType, tags?: string[]): Array<EntityJson<typeof type>> => {
    const searchKey = this.getters.getSearchKey(searchTerm, tags);
    const entities = this.root.entities.getters.getEntity(this.state.resultsIds[searchKey] ?? []) as Array<
      EntityJson<typeof type>
    >;

    if (searchTerm) {
      return entities;
    }
    return entities.filter((entity) => {
      const currTagIds = tagsParamsToTagIds(entity.tags);
      if (tags && tags?.length > 0) {
        return tags.every((id) => currTagIds.includes(id)) && true;
      } else {
        return false;
      }
    });
  };
};

export const getters: ModuleSearchGetters = {
  getIndex,
  getSearchResults,
  getSearchKey,
};
