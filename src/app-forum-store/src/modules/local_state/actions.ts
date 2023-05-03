import {
  EntityJson,
  EntityType,
  getActionIdFromOptimisticActionId,
  isActionEntity,
  normalizeId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleLocalStateActions, Pending, ThisLocalState as This } from './types';
import { mergeJson, omit, pickBy } from '@dispatch-services/utils-common/json';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions';
import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { EditMap } from '@dispatch-services/db-forum-common/pending/types';
import { ModuleAction } from '@dispatch-services/store';
import { parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';

const associateActionWithPendingId: ModuleAction<This> = async function (
  pendingId: string,
  actionJson: ActionEntityJson
) {
  if (!this.state.pending[pendingId]) {
    return;
  }
  const actionId = actionJson.pendingId;
  const realActionId = getActionIdFromOptimisticActionId(actionId);
  const pending: Pending = { ...this.state.pending[pendingId], ...{ actionId, realActionId } };
  await this.actions.updatePending([pending]);
};

const incrementPendingTime: ModuleAction<This> = async function (chainId: ChainId) {
  this.setState((state) => {
    state.pendingTime.time = state.pendingTime.time || 1;
    state.pendingTime.ct = (state.pendingTime.ct ?? 0) + 1;
  });
};

const updateLatestTime: ModuleAction<This> = async function <E extends EntityJson<any>>(this: This, entities: E[]) {
  for (let i = 0; i < entities.length; i++) {
    const { blockOrder, chainId, updatedBlockOrder, id } = entities[i];
    const { block, timestamp, txn } = parseBlockOrder(updatedBlockOrder || blockOrder);
    if (timestamp > this.state.latestTime.time && !this.state.pending[id]) {
      this.setState((state) => {
        state.latestTime.time = timestamp;
        state.latestTime.block[chainId] = block;
        state.latestTime.txn[chainId] = txn;
      });
    }
    // Update the pending time too.
    if (timestamp > this.state.pendingTime.time && !this.state.pending[id]) {
      this.setState((state) => {
        state.pendingTime.time = timestamp;
      });
    }
  }
};

const updatePending: ModuleAction<This> = async function (pendingArray: Pending[]) {
  this.setState((state) => {
    for (let i = 0; i < pendingArray.length; i++) {
      const pending = pendingArray[i];
      // The Pending object will always have a composedId (if action) or a pendingActionId or an actionId.
      const { actionId, composedId, pendingActionId } = pending;
      let currentPending =
        state.pending[actionId] ?? state.pending[pendingActionId] ?? state.pending[composedId] ?? pending;
      if (currentPending !== pending) {
        currentPending = mergeJson(
          currentPending,
          pickBy(pending, (v) => !!v)
        ) as Pending;
      }
      const omitAttributes = ['pendingIds', 'pendingBlockOrder', 'localPendingBlockOrder', 'normalizedIdToPendingId'];
      if (!currentPending.pendingActionId) {
        omitAttributes.push('composedId');
      }
      const keys = [
        ...Object.values(omit(currentPending, ...omitAttributes)),
        ...Object.keys(currentPending.pendingIds),
      ];
      keys.forEach((key) => {
        if (key) {
          state.pending[key] = currentPending;
        }
      });
    }
  });
};

const updateLocalPendingActionState: ModuleAction<This> = async function (
  actionJsonArray: Array<EntityJson<EntityType.Action>>
) {
  const pendingArray: Pending[] = actionJsonArray.map((actionJson) =>
    this.getters._createPendingObjectFromEntityJson(actionJson)
  );
  await this.actions.updatePending(pendingArray);
};

const updateLocalPendingEntitiesState: ModuleAction<This> = async function <E extends EntityJson<any>>(
  this: This,
  entities: E[]
) {
  // All entities that enter here will be pending in one way or the other.
  const pendingMap = entities.reduce<{ [actionId: string]: Pending }>((acc, entity) => {
    const { actionId } = entity;
    if (!acc[actionId]) {
      acc[actionId] = this.getters._createPendingObjectFromEntityJson(entity);
    }
    const normalizedId = normalizeId(entity.id);
    acc[actionId].pendingIds[normalizedId] = 1;
    acc[actionId].normalizedIdToPendingId[normalizedId] = entity.id;
    return acc;
  }, {});
  await this.actions.updatePending(Object.values(pendingMap));
};

const updateLocallyEditedParams: ModuleAction<This> = async function (editMap: EditMap) {
  const formattedEditMap = Object.entries(editMap).reduce<EditMap>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
  this.setState((state) => {
    state.locallyEditedParams = formattedEditMap;
  });
};

const setLocalPendingState: ModuleAction<This> = async function <E extends EntityJson<any>>(
  this: This,
  entities: E[],
  edits: EditMap | null
) {
  const actionJsonArray = entities.filter((i) => isActionEntity(i)) as Array<EntityJson<EntityType.Action>>;
  const entitiesArray = entities.filter((i) => !isActionEntity(i));
  await this.actions.updateLocalPendingActionState(actionJsonArray);
  await this.actions.updateLocalPendingEntitiesState(entitiesArray);
  edits && (await this.actions.updateLocallyEditedParams(edits));
  // console.log('local_state state', JSON.parse(JSON.stringify(this.state)));
};

const removeLocalPendingState: ModuleAction<This> = async function (
  actionIds: string[],
  entityIds: string[],
  pendingIdToCompletedId: { [pendingId: string]: string }
) {
  this.setState((state) => {
    actionIds.forEach((id) => {
      const { actionId, composedId, pendingActionId } = this.state.pending[id] ?? {};
      delete state.pending[id];
      delete state.pending[actionId];
      delete state.pending[pendingActionId];
      delete state.pending[composedId];
    });
    entityIds.forEach((entityId) => {
      const id = normalizeId(entityId);
      if (this.state.pending[id]) {
        const { pendingBlockOrder, actionId, pendingActionId, normalizedIdToPendingId } = this.state.pending[id];
        if (pendingIdToCompletedId[entityId] && !this.getters.isPendingId(pendingIdToCompletedId[entityId])) {
          state.locallyCreatedParams[pendingIdToCompletedId[entityId]] = {
            id: normalizedIdToPendingId[id],
            actionId,
            blockOrder: pendingBlockOrder,
          };
        }
        delete (state.pending[actionId] ?? state.pending[pendingActionId])?.pendingIds[id];
        delete state.pending[id];
      }
    });
  });
  // console.log('delete local_state state', JSON.parse(JSON.stringify(this.state)));
};

export const actions: ModuleLocalStateActions = {
  associateActionWithPendingId,
  incrementPendingTime,
  removeLocalPendingState,
  setLocalPendingState,
  updateLatestTime,
  updateLocallyEditedParams,
  updateLocalPendingActionState,
  updateLocalPendingEntitiesState,
  updatePending,
};
