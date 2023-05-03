import {
  ActionEntityJson,
  Crud,
  getActionIdsFromId,
  getComposedIdFromAction,
} from '@dispatch-services/db-forum-common/actions';
import {
  EntityJson,
  EntityType,
  getActionIdFromOptimisticActionId,
  getTypeFromId,
  hasAncestorActionId,
  isActionEntity,
  normalizeId,
  pendingActionIdReg,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleGetter, useTime } from '@dispatch-services/store';
import {
  ModuleLocalStateGetters,
  Pending,
  PendingMapForParentIds,
  PendingMapForParentIdsValue,
  ThisLocalState as This,
} from './types';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { EditMapValue } from '@dispatch-services/db-forum-common/pending/types';
import { packBlockTxn } from '@dispatch-services/db-forum-common/block_order';

const _createPendingObjectFromEntityJson: ModuleGetter<This> = function () {
  return (entityJson: EntityJson<any>) => {
    const actionId = this.getters.isPendingActionId(entityJson.actionId) ? '' : entityJson.actionId;
    const realActionId = actionId ? getActionIdFromOptimisticActionId(actionId) : '';
    const pending: Pending = {
      actionId,
      composedId: isActionEntity(entityJson) ? getComposedIdFromAction(entityJson as ActionEntityJson) : '',
      pendingActionId: actionId ? '' : entityJson.actionId,
      pendingBlockOrder: entityJson.blockOrder,
      realActionId,
      localPendingBlockOrder: this.getters.isPendingActionId(entityJson.actionId) ? entityJson.blockOrder : '',
      pendingIds: {},
      normalizedIdToPendingId: {},
    };
    return pending;
  };
};

const getEditParams: ModuleGetter<This> = function () {
  return <I extends EntityJson<any> | string, E extends I | I[], R extends EditMapValue | undefined>(
    inputEntities: E
  ): E extends E[] ? R[] : R => {
    const isArray = Array.isArray(inputEntities);
    const ids: string[] = (isArray ? inputEntities : [inputEntities]).map((i) =>
      normalizeId(typeof i === 'string' ? i : i.id)
    );
    const params = ids.map((id) => this.state.locallyEditedParams[id]);
    return (isArray ? params : params[0]) as E extends E[] ? R[] : R;
  };
};

const getLocallyCreatedId: ModuleGetter<This> = function () {
  return (id: string) => {
    return this.state.locallyCreatedParams[id]?.id;
  };
};

const getPendingCreateBlockOrder: ModuleGetter<This> = function () {
  return (chainId: ChainId, time?: number) => {
    const blockOrder = packBlockTxn(
      time ?? Math.max(this.state.pendingTime.time, useTime.computed.serverTimeSec),
      chainId,
      0,
      0
    );
    return blockOrder;
  };
};

const getPendingCreateParams: ModuleGetter<This> = function () {
  return (chainId: ChainId, time?: number) => {
    return {
      actionId: `Pending${this.state.pendingTime.ct ?? 0}`,
      blockOrder: this.getters.getPendingCreateBlockOrder(chainId, time),
    };
  };
};

const getPendingActionBlockOrder: ModuleGetter<This> = function () {
  return (composedId: string) => {
    return this.state.pending[composedId]?.pendingBlockOrder;
  };
};

const getPendingIdOfType: ModuleGetter<This> = function () {
  return (id: string, pendingIdType?: keyof Pending) => {
    if (!pendingIdType) {
      return this.state.pending[id];
    }
    return this.state.pending[id]?.[pendingIdType];
  };
};

const isDeletedEntity: ModuleGetter<This> = function () {
  return (entityId: string) => {
    const params = this.getters.getEditParams(entityId);
    return params?.crud === Crud.Delete;
  };
};

const isPendingActionId: ModuleGetter<This> = function () {
  return (id: string) => {
    return !!id.match(pendingActionIdReg);
  };
};

const pendingIdReg = /Pending\d+/;
const isPendingId: ModuleGetter<This> = function () {
  return (id: string) => {
    return !this.getters.isPendingActionId(id) && !!id.match(pendingIdReg);
  };
};

const isComposedId: ModuleGetter<This> = function () {
  return (id: string) => {
    const pending = this.state.pending[id];
    return pending?.composedId === id;
  };
};

const isPendingEntity: ModuleGetter<This> = function () {
  return (idOrJson: string | EntityJson<any>) => {
    const id = typeof idOrJson === 'string' ? idOrJson : idOrJson.id;
    return !!this.state.pending[normalizeId(id)];
  };
};

const _getParentActionIdToCheckAgainst: ModuleGetter<This> = function () {
  return (parentId?: string): string | undefined => {
    if (!parentId) {
      return;
    }
    const actionIds = getActionIdsFromId(parentId);
    return getActionIdFromOptimisticActionId(actionIds[actionIds.length - 1]);
  };
};

const _filterIdsForEntityTypeAndParent: ModuleGetter<This> = function () {
  return (ids: string[], type: EntityType, parentActionId?: string) => {
    return ids.filter(
      (id) =>
        getTypeFromId(id) === type &&
        !this.getters.isComposedId(id) &&
        (!parentActionId || hasAncestorActionId(id, parentActionId))
    );
  };
};

const _getLocallyCreatedMapForParentIds: ModuleGetter<This> = function () {
  return (type: EntityType, parentActionId: string) => {
    return this.getters
      ._filterIdsForEntityTypeAndParent(Object.keys(this.state.locallyCreatedParams), type, parentActionId)
      .reduce<PendingMapForParentIds>((acc, completedId) => {
        const { id, actionId } = this.state.locallyCreatedParams[completedId];
        acc[normalizeId(id)] = { completedId, actionId, pendingId: id };
        return acc;
      }, {});
  };
};

const _getPendingMapForParentIds: ModuleGetter<This> = function () {
  return (type: EntityType, parentActionId?: string) => {
    return this.getters
      ._filterIdsForEntityTypeAndParent(Object.keys(this.state.pending), type, parentActionId)
      .reduce<PendingMapForParentIds>((acc, normalizedId) => {
        const { actionId, normalizedIdToPendingId } = this.state.pending[normalizedId];
        acc[normalizedId] = { actionId, pendingId: normalizedIdToPendingId[normalizedId] };
        return acc;
      }, {});
  };
};

// We want to dedupe on actionId for an entity.
// Basically we want to first get a map of (opposite of what is there) pendingId -> { completedId, actionId } in locallyCreated
// Then we want a map of pendingId -> { actionId }  in pending
// Then we want to dedupe completed and pending by merging {...pending, ...completed }
// Then dedupe that object by actionId, prefering values with a completedId in it

// Note: Also pending counts gets shoved in as the wrong id.

const getPendingEntityIds: ModuleGetter<This> = function () {
  return (type: EntityType, parentId?: string) => {
    const parentActionId = this.getters._getParentActionIdToCheckAgainst(parentId);
    const actionMap = Object.values({
      ...this.getters._getPendingMapForParentIds(type, parentActionId),
      ...this.getters._getLocallyCreatedMapForParentIds(type, parentActionId),
    }).reduce<{ [actionId: string]: PendingMapForParentIdsValue }>((acc, value) => {
      // Now dedupe it by ActionId preferring values with a completedId
      const { completedId } = value;
      const actionId = getActionIdFromOptimisticActionId(value.actionId);
      // Get the real id for it here.
      if (!acc[actionId] || (completedId && !acc[actionId].completedId)) {
        acc[actionId] = value;
      }
      return acc;
    }, {});
    // Finally return the ids, preferring completedId over pendingId.
    return Object.values(actionMap).map(({ completedId, pendingId }) => completedId ?? pendingId);
  };
};

export const getters: ModuleLocalStateGetters = {
  _createPendingObjectFromEntityJson,
  _filterIdsForEntityTypeAndParent,
  _getLocallyCreatedMapForParentIds,
  _getParentActionIdToCheckAgainst,
  _getPendingMapForParentIds,
  getEditParams,
  getLocallyCreatedId,
  getPendingActionBlockOrder,
  getPendingCreateBlockOrder,
  getPendingEntityIds,
  getPendingIdOfType,
  getPendingCreateParams,
  isComposedId,
  isDeletedEntity,
  isPendingActionId,
  isPendingEntity,
  isPendingId,
};
