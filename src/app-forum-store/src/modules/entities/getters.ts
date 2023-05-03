import {
  EntityJson,
  EntityType,
  ModelStatus,
  getTypeFromId,
  hasAncestorActionId,
  isActionEntity as isAction,
  normalizeId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleEntitiesGetters, ThisEntities as This } from './types';

import { BaseJson } from '@dispatch-services/db-forum-common/actions/types';
import { ModuleGetter } from '@dispatch-services/store';
import { getActionIdsFromId } from '@dispatch-services/db-forum-common/actions';
import { useLocalState } from '@dispatch-services/app-forum-store/modules/local_state';

const getEntity: ModuleGetter<This> = function () {
  return <I extends string | string[], E extends EntityJson<any> | undefined>(
    idOrIds: I
  ): I extends string[] ? E[] : E => {
    const isArray = Array.isArray(idOrIds);
    const ids: string[] = isArray ? idOrIds : [idOrIds];
    const entities = ids.reduce<E[]>((acc, id) => {
      let entity = this.state.entities[id] as E;
      if (entity) {
        const _localId = useLocalState.getters.getLocallyCreatedId(id);
        // Note(Partyman): Not a good pattern to follow using a set in a get. Figure out a better place to put this.
        if (_localId && !entity._localId) {
          this.setState((state) => {
            state.entities[id]._localId = _localId;
          });
          entity = this.state.entities[id] as E;
        }
        acc.push(entity);
      }
      return acc;
    }, []);
    return (isArray ? entities : entities[0]) as I extends string[] ? E[] : E;
  };
};

const getEntityId: ModuleGetter<This> = function () {
  return <B extends BaseJson>(json: B) => {
    // Check to see if we have pendintId for it. If we do, use that.
    return json.id;
  };
};

const isActionEntity: ModuleGetter<This> = function () {
  return <T extends BaseJson>(entity: T) => {
    return isAction(entity as any);
  };
};

const isStaleEntity: ModuleGetter<This> = function () {
  return <T extends BaseJson>(entity: T) => {
    const isStaleEntity = this.state.entities[entity.id]?.updatedBlockOrder > entity.updatedBlockOrder;
    return isStaleEntity;
  };
};

const isDeletedEntity: ModuleGetter<This> = function () {
  return <T extends EntityJson<any>>(inputEntity: T) => {
    if (!inputEntity) {
      return false;
    }
    return inputEntity.status === ModelStatus.Deleted || useLocalState.getters.isDeletedEntity(inputEntity.id);
  };
};

const getEntityIdFromActionId: ModuleGetter<This> = function () {
  return (actionId: string, type: EntityType) => {
    let entityIds = Object.keys(this.state.actionIdToEntityId[actionId] ?? {}).filter((i) => i !== actionId);
    if (!entityIds.length) {
      entityIds = Object.values(useLocalState.getters.getPendingIdOfType(actionId, 'normalizedIdToPendingId') ?? {});
    }
    for (let i = 0; i < entityIds.length; i++) {
      if (getTypeFromId(entityIds[i]) === type && !useLocalState.getters.isPendingId(entityIds[i])) {
        return entityIds[i];
      }
    }
  };
};

const getEntityFromActionId: ModuleGetter<This> = function () {
  return (actionId: string, type: EntityType) => {
    const id = this.getters.getEntityIdFromActionId(actionId, type);
    if (!id) {
      return;
    }
    return this.getters.getEntity(id);
  };
};

const getEntityParam: ModuleGetter<This> = function () {
  return <T extends EntityType>(
    entityJson: EntityJson<T>,
    key: keyof typeof entityJson
  ): typeof entityJson[typeof key] => {
    const pendingEdit = this.getters.getPendingEdit(entityJson.id);
    return pendingEdit?.params[key as string] ?? entityJson[key as string];
  };
};

const getPendingEdit: ModuleGetter<This> = function () {
  return (id: string) => {
    const params = useLocalState.getters.getEditParams(id);
    return params;
  };
};

const getEntitiesWithPending: ModuleGetter<This> = function () {
  return (entities: Array<EntityJson<any>>, type: EntityType, parentId?: string) => {
    let parentActionId: string | undefined;
    if (parentId) {
      const actionIds = getActionIdsFromId(parentId);
      parentActionId = actionIds[actionIds.length - 1];
    }
    const entityMap = entities.reduce<{ [normalizedId: string]: EntityJson<typeof type> }>((acc, entityJson) => {
      if (
        entityJson &&
        getTypeFromId(entityJson.id) === type &&
        (!parentId ||
          entityJson.parentId === parentId ||
          (parentActionId && hasAncestorActionId(entityJson.id, parentActionId)))
      ) {
        acc[normalizeId(entityJson.id)] = entityJson;
      }
      return acc;
    }, {});
    this.getters.getPendingEntities(type, parentId).reduce((acc, entityJson) => {
      const id = normalizeId(entityJson.id);
      if (!acc[id]) {
        acc[id] = entityJson;
      }
      return acc;
    }, entityMap);
    return Object.values(entityMap);
  };
};

const getPendingEntities: ModuleGetter<This> = function () {
  return (type: EntityType, parentId?: string) => {
    // TODO(partyman): shouldn't need to filter, id isn't being deleted.
    const entities = this.getters.getEntity(useLocalState.getters.getPendingEntityIds(type, parentId)) as Array<
      EntityJson<any>
    >;
    const filteredEntities = entities.filter((entity) => !!entity);
    return filteredEntities;
  };
};

const getPendingEntity: ModuleGetter<This> = function () {
  return (id: string) => {
    id = normalizeId(id);
    if (!useLocalState.state.pending[id]) {
      return;
    }
    id = useLocalState.state.pending[id].normalizedIdToPendingId[id];
    return this.getters.getEntity(id);
  };
};

export const getters: ModuleEntitiesGetters = {
  getEntitiesWithPending,
  getEntity,
  getEntityFromActionId,
  getEntityId,
  getEntityParam,
  getPendingEdit,
  getPendingEntities,
  getPendingEntity,
  isActionEntity,
  isDeletedEntity,
  isStaleEntity,
  getEntityIdFromActionId,
};
