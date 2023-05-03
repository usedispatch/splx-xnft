import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleSearchActions, ThisSearch as This } from './types';

import { Document } from 'flexsearch';
import { ModuleAction } from '@dispatch-services/store';

const createIndex: ModuleAction<This> = async function <T extends EntityType>(
  this: This,
  type: T,
  fieldsToIndex: Array<keyof EntityJson<T>>
) {
  const index = new Document<EntityJson<T>>({
    tokenize: 'full',
    optimize: true,
    cache: 100,
    context: true,
    document: {
      id: 'id',
      index: fieldsToIndex as string[],
      tag: 'tagIds',
    },
  });
  this.setState((state) => {
    state.indexes[type] = index as any;
  });
};

const addToIndex: ModuleAction<This> = async function (type: EntityType, entities: Array<EntityJson<typeof type>>) {
  const index = this.getters.getIndex(type) as Document<EntityJson<typeof type>>;
  index &&
    this.setState((state) => {
      entities.forEach((entity) => {
        (entity as any).tagIds = entity.tags.map((tag) => (tag as any).id);
        state.indexes[type].add(entity as any);
      });
    });
};

const search: ModuleAction<This> = async function (query: string, type: EntityType, tags: string[]) {
  const index = this.getters.getIndex(type);
  if (!index) {
    return;
  }
  const searchKey = this.getters.getSearchKey(query, tags);
  const results = await index.searchAsync(query, { tag: tags, bool: 'and' });
  // NOTE(Partyman): These results come back as an array of objects with { field: string, result: ids[] }
  // So, if you want to know what field had the result, this is where you'd look. (In case we start indexing more fields
  // than just title -- tags for instance.)
  this.setState((state) => {
    const allIds = results.reduce<string[]>((acc, { result }) => {
      return result.reduce((acc, id) => {
        // NOTE(zfaizal2): if results greater than 1, find intersection of ids across all results by tags
        // else if results is 1, just add the id -- may need to modify in the future
        acc.push(id as string);
        return acc;
      }, acc);
    }, []);
    state.resultsIds[searchKey] = [...new Set(allIds)];
  });
};

export const actions: ModuleSearchActions = {
  createIndex,
  addToIndex,
  search,
};
