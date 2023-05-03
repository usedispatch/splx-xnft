import { EditMap, EditMapValue } from '@dispatch-services/db-forum-common/pending/types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions';
import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisLocalState = ModuleApi<
  ModuleLocalStateState,
  ModuleLocalStateComputed,
  ModuleLocalStateGetters,
  ModuleLocalStateActions
>;
type This = ThisLocalState;

export interface Pending {
  pendingActionId: string;
  pendingIds: { [normalizedId: string]: 1 };
  normalizedIdToPendingId: { [normalizedId: string]: string };
  actionId: string;
  realActionId: string;
  composedId: string;
  pendingBlockOrder: string;
  localPendingBlockOrder: string;
}

interface ChainTime {
  time: number;
  block: { [chainId: number]: number };
  txn: { [chainId: number]: number };
}

interface PendingChainTime extends ChainTime {
  ct: number;
}

export interface LocalPendingParams {
  actionId: string; // the pendingActionId
  blockOrder: string; // the pending block order
}

export interface LocallyCreatedParams extends LocalPendingParams {
  id: string; // The id with the real actionId but fake block order.
}

export interface PendingMap {
  [pendingKey: string]: Pending;
}

export interface PendingMapForParentIdsValue {
  actionId: string;
  pendingId: string;
  completedId?: string;
}

export interface PendingMapForParentIds {
  [pendingId: string]: PendingMapForParentIdsValue;
}

export interface ModuleLocalStateState {
  latestTime: ChainTime;
  pendingTime: PendingChainTime;
  pending: PendingMap;
  locallyCreatedParams: { [id: string]: LocallyCreatedParams };
  locallyEditedParams: EditMap;
}

export interface ModuleLocalStateComputed {
  pendingActionId: () => string;
}

export interface ModuleLocalStateGetters {
  _createPendingObjectFromEntityJson: () => (entityJson: EntityJson<any>) => Pending;
  _filterIdsForEntityTypeAndParent: () => (ids: string[], type: EntityType, parentActionId?: string) => string[];
  _getLocallyCreatedMapForParentIds: () => (type: EntityType, parentActionId?: string) => PendingMapForParentIds;
  _getParentActionIdToCheckAgainst: () => (parentId?: string) => string | undefined;
  _getPendingMapForParentIds: () => (type: EntityType, parentActionId?: string) => PendingMapForParentIds;
  getEditParams: () => <I extends EntityJson<any> | string, E extends I | I[], R extends EditMapValue | undefined>(
    inputEntities: E
  ) => E extends E[] ? R[] : R;
  getLocallyCreatedId: () => (id: string) => string | undefined;
  getPendingActionBlockOrder: () => (composingId: string) => string | undefined;
  getPendingCreateBlockOrder: () => (chainId: ChainId, time?: number) => string;
  getPendingEntityIds: () => (type: EntityType, parentId?: string) => string[];
  getPendingIdOfType: () => <K extends keyof Pending>(
    id: string,
    pendingIdType?: K
  ) => typeof pendingIdType extends K ? Pending[K] : Pending;
  getPendingCreateParams: () => (chainId: ChainId, time?: number) => LocalPendingParams;
  isComposedId: () => (id: string) => boolean;
  isDeletedEntity: () => (entityId: string) => boolean;
  isPendingActionId: () => (id: string) => boolean;
  isPendingEntity: () => (idOrJson: string | EntityJson<any>) => boolean;
  isPendingId: () => (id: string) => boolean;
}

export interface ModuleLocalStateActions {
  associateActionWithPendingId: (this: This, pendingId: string, actionJson: ActionEntityJson) => Promise<void>;
  incrementPendingTime: (this: This, chainId: ChainId) => Promise<void>;
  removeLocalPendingState: (
    this: This,
    actionIds: string[],
    entityIds: string[],
    pendingIdToCompletedId: { [pendingId: string]: string }
  ) => Promise<void>;
  setLocalPendingState: <E extends EntityJson<any>>(entities: E[], edits: EditMap | null) => Promise<void>;
  updateLatestTime: <E extends EntityJson<any>>(this: This, entities: E[]) => Promise<void>;
  updateLocallyEditedParams: (this: This, edits: EditMap) => Promise<void>;
  updateLocalPendingActionState: (this: This, actionJsonArray: Array<EntityJson<EntityType.Action>>) => Promise<void>;
  updateLocalPendingEntitiesState: (this: This, entities: Array<EntityJson<any>>) => Promise<void>;
  updatePending: (pendingArray: Pending[]) => Promise<void>;
}
