import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { BaseJson } from '@dispatch-services/db-forum-common/actions/types';
import { EditMapValue } from '@dispatch-services/db-forum-common/pending/types';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisEntities = ModuleApi<
  ModuleEntitiesState,
  ModuleEntitiesComputed,
  ModuleEntitiesGetters,
  ModuleEntitiesActions
>;
type This = ThisEntities;

interface ActionIdToEntityId {
  [actionId: string]: { [entityId: string]: 1 };
}

export interface ModuleEntitiesState {
  entities: { [id: string]: BaseJson };
  actionIdToEntityId: ActionIdToEntityId;
}

export interface ModuleEntitiesComputed {
  pendingEntities: <B extends BaseJson>() => B[];
}

export interface ModuleEntitiesGetters {
  getEntitiesWithPending: () => (
    entities: Array<EntityJson<any>>,
    type: EntityType,
    parentId?: string
  ) => Array<EntityJson<typeof type>>;
  getEntity: () => <I extends string | string[], E extends EntityJson<any> | undefined>(
    idOrIds: I
  ) => I extends string[] ? E[] : E;
  getEntityFromActionId: () => (actionId: string, entityType: EntityType) => EntityJson<typeof entityType> | undefined;
  getEntityId: () => <B extends BaseJson>(entity: B) => string;
  getEntityParam: () => <T extends EntityType>(
    entityJson: EntityJson<T>,
    key: keyof typeof entityJson
  ) => typeof entityJson[typeof key];
  getPendingEdit: () => (id: string) => EditMapValue | undefined;
  getPendingEntities: () => (type: EntityType, parentId?: string) => Array<EntityJson<any>>;
  getPendingEntity: () => (id: string) => EntityJson<any> | undefined;
  isActionEntity: () => <B extends BaseJson>(entity: B) => boolean;
  isDeletedEntity: () => <B extends BaseJson>(entity: B) => boolean;
  isStaleEntity: () => <B extends BaseJson>(entity: B) => boolean;
  getEntityIdFromActionId: () => (actionId: string, entityType: EntityType) => string | undefined;
}

export interface MutateStatePayload<B extends BaseJson, E extends B | B[]> {
  inputEntities: E;
  storeActionKey: string;
}

export interface ModuleEntitiesActions {
  mutateState: <B extends BaseJson, E extends B | B[]>(this: This, payload: MutateStatePayload<B, E>) => Promise<void>;
  removeEntities: (ids: string[]) => Promise<void>;
}
