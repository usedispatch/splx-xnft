import {
  ActionCreate,
  ActionCreateInput,
  ActionEntityJson,
  ActionMap,
  Crud,
  LocalMetadata,
  createActionJsonFromEntity,
  createActionJsonFromRpc,
  createActionRpc,
  getActionIdsFromId,
  getComposedIdFromAction,
  getIdFromAction,
  getLastActionIdFromId,
  getRelatedEntityIds,
  getTargetIdFromAction,
  getTargetKeyFromAction,
  isOptimisticActionId,
  regenerateIdWithAction,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '@dispatch-services/app-forum-store/modules/api';
import {
  EntityJson,
  EntityType,
  ModelStatus,
  getActionIdFromOptimisticActionId,
  getInteractionAncestorIds,
  getParsedPostboxIdFromId,
  getPendingTimestampFromActionId,
  getRelatedCurrentUserIds,
  getRelatedPostboxIds,
  getTypeFromId,
  isActionEntity,
  normalizeId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleActionsGetters, PendingMutationInput, ThisActions as This } from './types';
import { ParsedBlockOrder, parseBlockOrder } from '@dispatch-services/db-forum-common/block_order';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { EntitiesMap } from '@dispatch-services/db-forum-common/pending/types';
import { ModuleGetter } from '@dispatch-services/store';
import { mergeJson } from '@dispatch-services/utils-common/json';
import { signActionRpc } from '@dispatch-services/db-forum-common/proxy_wallet';
import { useBlockchain } from '@dispatch-services/app-forum-store/modules/blockchain';
import { useEntities } from '@dispatch-services/app-forum-store/modules/entities';
import { useLocalState } from '../local_state';
import { useUser } from '@dispatch-services/app-forum-store/modules/user';
import { useUserProfile } from '@dispatch-services/app-forum-store/modules/user_profile';
import { useWallet } from '../wallet';

const getActionsRequestConfig: ModuleGetter<This> = function () {
  return (actionIds: string[]): ApiRequestConfig => {
    const creatorId = useUser.computed.userId ?? '';
    return {
      baseURL: useApi.computed.baseUrl,
      url: '/action',
      method: 'get',
      params: {
        actionIds,
        creatorId,
      },
    };
  };
};

const getActionCancelRequestConfig: ModuleGetter<This> = function () {
  return (actionJson: ActionEntityJson): ApiRequestConfig => {
    const actionId = actionJson.id;
    return {
      baseURL: useApi.computed.baseUrl,
      method: 'post',
      url: '/action/cancel/:actionId',
      subDirectories: { actionId },
      data: {
        action: {
          actionDeleteKey: actionJson.meta?.actionDeleteKey ?? '',
        },
      },
    };
  };
};

const getActionPostRequestConfig: ModuleGetter<This> = function () {
  return <E extends EntityType, C extends Crud>(action: ActionCreate<E, C>, meta: LocalMetadata): ApiRequestConfig => {
    const rpc = createActionRpc(
      useUser.computed.userId,
      useWallet.state.walletId,
      useBlockchain.state.chainId,
      action.type,
      action.crud,
      action,
      meta
    );
    const data: any = {
      action: rpc,
    };
    if (useWallet.computed.hasFunds && !useUserProfile.computed.preferWalletPopups) {
      data.signature = signActionRpc(rpc, useWallet.computed.proxyKey);
    }
    return {
      baseURL: useApi.computed.baseUrl,
      method: 'post',
      url: 'action',
      data,
    };
  };
};

const getActionsFromRequest: ModuleGetter<This> = function () {
  return (request: ApiRequestConfig) => {
    const results = useApi.getters.getResponse(request);
    return results.filter((i) => isActionEntity(i));
  };
};

const getPendingPollerKey: ModuleGetter<This> = function () {
  return (creatorId?: string) => {
    return `pendingActionsPoller-${creatorId ?? useUser.computed.userId}`;
  };
};

const getPendingIdFromEntityId: ModuleGetter<This> = function () {
  return (id: string) => {
    const actionJson = this.getters.getPendingActionFromEntityId(id);
    return actionJson ? getIdFromAction(actionJson) : id;
  };
};

const getPendingActionFromEntityId: ModuleGetter<This> = function () {
  return (entityId: string) => {
    const actionId = getLastActionIdFromId(entityId);
    const id = getActionIdFromOptimisticActionId(actionId);
    let action = useEntities.getters.getEntity(id) as EntityJson<EntityType.Action> | undefined;
    // If we didn't find the action, then we'll have to re-create it from the entity.
    // If it turns out the entity is one that was pending already but now cleared (ie, it's in pendingPostboxParams), then we'll want to recreate it
    // with those pending params.
    if (!action) {
      const parsedPostboxId = getParsedPostboxIdFromId(entityId);
      if (parsedPostboxId) {
        const postboxId = parsedPostboxId[parsedPostboxId.length - 1].id;
        const type = getTypeFromId(postboxId);
        let entity = useEntities.getters.getEntityFromActionId(id, type);
        if (entity) {
          // We want to make sure we use the pending params if we need them.
          const pendingParams = useLocalState.getters.getPendingIdOfType(id);
          if (pendingParams) {
            const { actionId, pendingBlockOrder } = pendingParams;
            const { block, timestamp, txn } = parseBlockOrder(pendingBlockOrder);
            entity = {
              ...entity,
              ...{
                block,
                time: timestamp,
                txn,
                actionId,
              },
            };
          }
          action = createActionJsonFromEntity(entity);
          action.id = getActionIdFromOptimisticActionId(action.id);
        }
      }
    }
    if (action) {
      // Then we want to make sure we're using the pending action params.
      action = this.getters.getPendingActionJson(action);
    }
    return action;
  };
};

const getPendingAndCompletedActionInputs: ModuleGetter<This> = function () {
  return (curr: ActionEntityJson[], completed: ActionEntityJson[]) => {
    const pendingInput = this.getters.getEntitiesAndActionsFromPendingActions(curr);
    const completedInput = this.getters.getEntitiesAndActionsFromPendingActions(completed);
    const completedActions = completed.reduce<ActionMap>((acc, completedAction) => {
      acc[completedAction.id] = completedAction;
      return acc;
    }, {});
    const pendingIdToCompletedId = Object.keys(completedInput.entities).reduce<{ [pendingId: string]: string }>(
      (acc, pendingId) => {
        if (getTypeFromId(pendingId) !== EntityType.Action) {
          acc[pendingId] = regenerateIdWithAction(pendingId, completedActions);
        }
        return acc;
      },
      {}
    );
    // Now go through and remove any entities that pending is still relying on.
    completedInput.entities = Object.entries(completedInput.entities).reduce<EntitiesMap>((acc, [id, entityJson]) => {
      if (!pendingInput.entities[id]) {
        acc[id] = entityJson;
      }
      return acc;
    }, {});
    completedInput.actions = Object.entries(completedInput.actions).reduce<ActionMap>((acc, [id, actionJson]) => {
      if (!pendingInput.actions[id]) {
        acc[id] = actionJson;
      }
      return acc;
    }, {});

    return {
      pendingInput,
      completedInput,
      pendingIdToCompletedId,
    };
  };
};

const getCompletedActions: ModuleGetter<This> = function () {
  return (prev: ActionEntityJson[], curr: ActionEntityJson[]) => {
    const returnedMap = curr.reduce<{ [actionId: string]: 1 }>((acc, action) => {
      acc[action.id] = 1;
      return acc;
    }, {});
    return prev.reduce<ActionEntityJson[]>((acc, action) => {
      if (!returnedMap[action.id]) {
        acc.push(action);
      }
      return acc;
    }, []);
  };
};

const getEntitiesAndActionsFromPendingActions: ModuleGetter<This> = function () {
  return (actionJsonArrayInput: ActionEntityJson[]): PendingMutationInput => {
    // First format the actionJson properly to use pending ids.
    const actionJsonArray = actionJsonArrayInput.map((a) => this.getters.getPendingActionJson(a));
    // Now, get all of the related actions.
    const actions = this.getters.getActionsMapFromPendingActions(actionJsonArray);
    const entities = this.getters.getEntitiesFromPendingActions(actions);
    const active = Object.entries(entities).reduce<PendingMutationInput['active']>((acc, [pendingId, entityJson]) => {
      const nId = normalizeId(pendingId);
      if (entityJson?.status === ModelStatus.Active) {
        acc[nId] = pendingId;
      }
      return acc;
    }, {});

    return {
      actions,
      entities,
      active,
      input: actionJsonArray,
    };
  };
};

const getPendingTimestampFromAction: ModuleGetter<This> = function () {
  return (actionJson: ActionEntityJson) => {
    const { actionId } = actionJson;
    const isPending = useLocalState.getters.isPendingActionId(actionId);
    let time = isPending ? 0 : getPendingTimestampFromActionId(actionId);
    if (isPending) {
      const blockOrder = useLocalState.getters.getPendingIdOfType(actionId)?.localPendingBlockOrder ?? '';
      if (blockOrder) {
        const { timestamp } = parseBlockOrder(blockOrder);
        time = timestamp;
      } else if (actionJson.time) {
        // Then it JUST got created.
        time = actionJson.time;
      }
    } else if (!time) {
      time = actionJson.time ?? 0;
    }
    return time;
  };
};

const getPendingActionJson: ModuleGetter<This> = function () {
  return (actionJson: ActionEntityJson) => {
    // This makes sure any entities using this action to create themselves will use the pendingIds/blockOrder throughout.
    // First, switch out the actionId for the pending one.
    if (actionJson.pendingId && actionJson.actionId !== actionJson.pendingId) {
      actionJson = { ...actionJson, ...{ actionId: actionJson.pendingId } };
    }
    // Next fill in the proper block order.
    if (!actionJson.blockOrder || !!actionJson.time) {
      // If it has a time, then it was crawled and so we want to replace the time with the pending time.
      // This will use full pending ids (${time}?${actionId}) for everything.
      // Need to check if it's a pendingId and use localPendingBlockOrder if so.
      const timestamp = this.getters.getPendingTimestampFromAction(actionJson);
      const blockOrder = useLocalState.getters.getPendingCreateBlockOrder(actionJson.chainId, timestamp);
      actionJson = { ...actionJson, ...{ blockOrder, time: 0 } };
    }
    if (!actionJson.time) {
      const { block, timestamp, txn } = parseBlockOrder(actionJson.blockOrder);
      actionJson = { ...actionJson, ...{ block, time: timestamp, txn } };
    }
    // Fix the target if can.
    if (actionJson.originalTargetId && actionJson.originalTargetId !== getTargetIdFromAction(actionJson)) {
      // Then we need to fix the action.action
      const key = getTargetKeyFromAction(actionJson);
      if (actionJson.action[key]) {
        actionJson = mergeJson(actionJson, { action: { [key]: actionJson.originalTargetId } }) as ActionEntityJson;
      }
    }
    return JSON.parse(JSON.stringify(actionJson));
  };
};

const getActionsMapFromPendingActions: ModuleGetter<This> = function () {
  return (pendingActionJsonArray: ActionEntityJson[]) => {
    // Get all the actions we would need to recreate entities. Also, we want to make sure that we're always
    // recreating / using ids for previously optimisitc actions that have cleared.
    const pendingPostboxParams = this.getters.getRelatedPendingPostboxActionParams(pendingActionJsonArray);
    return pendingActionJsonArray.reduce<ActionMap>(
      (acc, actionJson) => {
        return this.getters.getRelatedIds(actionJson).reduce((acc, entityId) => {
          return this.getters.getRelatedActionIds(entityId).reduce((acc, actionId) => {
            const id = getActionIdFromOptimisticActionId(actionId);
            let action = (acc[id] ?? useEntities.getters.getEntity(id)) as EntityJson<EntityType.Action> | undefined;
            // If we didn't find the action, then we'll have to re-create it from the entity.
            // If it turns out the entity is one that was pending already but now cleared (ie, it's in pendingPostboxParams), then we'll want to recreate it
            // with those pending params.
            if (!action) {
              const parsedPostboxId = getParsedPostboxIdFromId(entityId);
              if (parsedPostboxId) {
                const postboxId = parsedPostboxId[parsedPostboxId.length - 1].id;
                const type = getTypeFromId(postboxId);
                let entity = useEntities.getters.getEntityFromActionId(id, type);
                if (entity) {
                  // We want to make sure we use the pending params if we need them.
                  if (pendingPostboxParams[entity.actionId]) {
                    const { block, timestamp, txn, pendingId } = pendingPostboxParams[entity.actionId];
                    entity = { ...entity, ...({ block, time: timestamp, txn, actionId: pendingId } as any) };
                  }
                  action = createActionJsonFromEntity(entity as EntityJson<any>);
                  action.id = getActionIdFromOptimisticActionId(action.id);
                }
              }
            }
            if (action?.action && !acc[action.id]) {
              // Then we want to make sure we're using the pending action params.
              action = this.getters.getPendingActionJson(action);
              acc[action.id] = action;
            }
            return acc;
          }, acc);
        }, acc);
      },
      pendingActionJsonArray.reduce<ActionMap>((acc, actionJson) => {
        acc[actionJson.id] = actionJson;
        return acc;
      }, {})
    );
  };
};

const getRelatedPendingPostboxActionParams: ModuleGetter<This> = function () {
  return (pendingActionJsonArray: ActionEntityJson[]) => {
    return pendingActionJsonArray.reduce<{ [actionId: string]: ParsedBlockOrder & { pendingId: string } }>(
      (acc, pendingActionJson) => {
        const targetId = getTargetIdFromAction(pendingActionJson);
        if (targetId) {
          const parsedId = getParsedPostboxIdFromId(targetId);
          if (parsedId) {
            for (let i = 0; i < parsedId.length; i++) {
              const parsedPostboxId = parsedId[i];
              const pendingId = parsedPostboxId.actionId;
              if (isOptimisticActionId(pendingId)) {
                const actionId = getActionIdFromOptimisticActionId(pendingId);
                if (!acc[actionId]) {
                  acc[actionId] = { ...parsedPostboxId.blockOrder, ...{ pendingId } };
                }
              }
            }
          }
        }
        return acc;
      },
      {}
    );
  };
};

const getRelatedActionIds: ModuleGetter<This> = function () {
  return (entityId: string) => {
    const actionIdMap = getActionIdsFromId(entityId).reduce<{ [actionId: string]: number }>((acc, aId) => {
      const actionId = getActionIdFromOptimisticActionId(aId);
      if (!acc[actionId]) {
        acc[actionId] = 0;
      }
      acc[actionId]++;
      return acc;
    }, {});

    return Object.keys(actionIdMap);
  };
};

const getEntitiesFromPendingActions: ModuleGetter<This> = function () {
  return (actions: ActionMap): EntitiesMap => {
    // First dedupe all of these entities by normalizing their id.
    const normalized = Object.values(actions).reduce<{ [normalizedId: string]: string[] }>((acc, actionJson) => {
      return this.getters.getRelatedIds(actionJson).reduce((acc, entityId) => {
        const nId = normalizeId(entityId);
        if (!acc[nId]) {
          acc[nId] = [];
        }
        acc[nId].push(entityId);
        return acc;
      }, acc);
    }, {});
    // Now go through and choose the id that we have an entity for. If we don't have an entity for one of the duped ids (ie normal id vs. pending id) found
    // then just use hte first one.
    return Object.entries(normalized).reduce<EntitiesMap>((acc, [nId, ids]) => {
      let entity: EntityJson<any> | undefined;
      let id: string | undefined;
      for (let i = 0; i < ids.length; i++) {
        id = ids[i];
        entity = useEntities.getters.getEntity(id) as EntityJson<any> | undefined;
        if (entity) {
          break;
        }
      }
      id = (entity ? id : ids[0]) as string;
      acc[id] = entity;
      return acc;
    }, {});
  };
};

const getRelatedIds: ModuleGetter<This> = function () {
  return (actionJson: ActionEntityJson) => {
    // First get the related ids for the action.
    const relatedIdsForAction = [getIdFromAction(actionJson), ...getRelatedEntityIds(actionJson)];
    // Now get the related ids for each entity.
    const relatedPostboxIds = getRelatedPostboxIds(relatedIdsForAction);
    const relatedCurrentUserSpecificIds = getRelatedCurrentUserIds(
      [...relatedIdsForAction, ...relatedPostboxIds],
      useUser.computed.userId
    );
    // Now from the current user ids, get the entities for the interactions.
    const relatedInteractionAncestorIds = getInteractionAncestorIds(
      relatedCurrentUserSpecificIds.map((id) => useEntities.getters.getEntity(id) as EntityJson<any>)
    );
    const relatedIds = [
      ...relatedIdsForAction,
      ...relatedPostboxIds,
      ...relatedCurrentUserSpecificIds,
      ...relatedInteractionAncestorIds,
    ];
    return [...new Set(relatedIds)];
  };
};

const getComposedIdFromCreateActionInput: ModuleGetter<This> = function () {
  return <E extends EntityType, C extends Crud>(params: ActionCreateInput<E, C>, type: EntityType, crud: Crud) => {
    const rpc = createActionRpc(
      useUser.computed.userId,
      useWallet.state.walletId,
      useBlockchain.state.chainId,
      type,
      crud,
      params
    );
    const pendingActionId = useLocalState.computed.pendingActionId;
    const pendingBlockOrder = useLocalState.getters.getPendingActionBlockOrder(pendingActionId) as string;
    const actionJson = createActionJsonFromRpc(rpc, pendingActionId, pendingBlockOrder);
    return getComposedIdFromAction(actionJson);
  };
};

const getPendingActionsForChain: ModuleGetter<This> = function () {
  return (chainId: ChainId) => {
    return this.computed.pendingActions.filter((i) => i.chainId === chainId);
  };
};

export const getters: ModuleActionsGetters = {
  getEntitiesAndActionsFromPendingActions,
  getActionsFromRequest,
  getActionsMapFromPendingActions,
  getActionCancelRequestConfig,
  getActionPostRequestConfig,
  getActionsRequestConfig,
  getCompletedActions,
  getComposedIdFromCreateActionInput,
  getPendingActionsForChain,
  getPendingAndCompletedActionInputs,
  getEntitiesFromPendingActions,
  getPendingActionJson,
  getPendingActionFromEntityId,
  getPendingIdFromEntityId,
  getPendingPollerKey,
  getPendingTimestampFromAction,
  getRelatedIds,
  getRelatedActionIds,
  getRelatedPendingPostboxActionParams,
};
