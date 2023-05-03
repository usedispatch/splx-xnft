import { EntityJson, EntityType, getTypeFromId } from '@dispatch-services/db-forum-common/entities';
import { ModuleEntitiesActions, MutateStatePayload, ThisEntities as This } from './types';

import { BaseJson } from '@dispatch-services/db-forum-common/actions/types';
import { ModuleAction } from '@dispatch-services/store';
import { useLocalState } from '../local_state';
import { useSearch } from '../search';

// Get entities from the api and dump them in here.
async function indexProductTopics(entities: Array<EntityJson<any>>) {
  const productEntities = entities.filter(
    (entity) =>
      getTypeFromId(entity.id) === EntityType.ProductTopic && !!(entity as EntityJson<EntityType.ProductTopic>).block
  ) as Array<EntityJson<EntityType.ProductTopic>>;
  if (!productEntities.length) {
    return;
  }
  if (!useSearch.getters.getIndex(EntityType.ProductTopic)) {
    type T = keyof EntityJson<EntityType.ProductTopic>;
    const indexedFields: T[] = ['title'];
    await useSearch.actions.createIndex(EntityType.ProductTopic, indexedFields as any);
  }
  void useSearch.actions.addToIndex(EntityType.ProductTopic, productEntities);
}

function indexEntities(entities: Array<EntityJson<any>>) {
  void indexProductTopics(entities);
}

async function mutateState<B extends BaseJson, E extends B | B[]>(this: This, payload: MutateStatePayload<B, E>) {
  const { inputEntities } = payload;
  const entities: B[] = (Array.isArray(inputEntities) ? inputEntities : [inputEntities]).filter((i) => {
    const staleEntity = this.getters.isStaleEntity(i);
    return !staleEntity;
  });
  this.setState((state) => {
    entities.forEach((entity) => {
      state.entities[entity.id] = entity;
      if (!state.actionIdToEntityId[entity.actionId]) {
        state.actionIdToEntityId[entity.actionId] = {};
      }
      state.actionIdToEntityId[entity.actionId][entity.id] = 1;
    });
  });
  indexEntities(entities as any);
  await useLocalState.actions.updateLatestTime(entities as unknown as Array<EntityJson<any>>);
}

const removeEntities: ModuleAction<This> = async function (ids: string[]) {
  this.setState((state) => {
    ids.forEach((id) => {
      const actionId = state.entities[id]?.actionId;
      delete state.entities[id];
      actionId && delete state.actionIdToEntityId[actionId][id];
    });
  });
};

export const actions: ModuleEntitiesActions = {
  mutateState,
  removeEntities,
};
