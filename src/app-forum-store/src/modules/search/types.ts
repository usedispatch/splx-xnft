import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { Document } from 'flexsearch';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisSearch = ModuleApi<ModuleSearchState, ModuleSearchComputed, ModuleSearchGetters, ModuleSearchActions>;
type This = ThisSearch;

export interface ModuleSearchState {
  resultsIds: { [searchKey: string]: string[] };
  indexes: { [entityType: number]: Document<EntityJson<typeof entityType>> };
}

export interface ModuleSearchComputed {
  exampleComputed: () => number;
}

export interface ModuleSearchGetters {
  getIndex: () => (type: EntityType) => Document<EntityJson<typeof type>> | undefined;
  getSearchResults: () => (query: string, type: EntityType, tags?: string[]) => Array<EntityJson<typeof type>>;
  getSearchKey: () => (searchTerm: string, tags?: string[]) => string;
}

export interface ModuleSearchActions {
  addToIndex: (this: This, type: EntityType, entities: Array<EntityJson<typeof type>>) => Promise<void>;
  createIndex: <T extends EntityType>(this: This, type: T, fieldsToIndex: Array<keyof EntityJson<T>>) => Promise<void>;
  search: (this: This, query: string, type: EntityType, tags?: string[]) => Promise<void>;
}
