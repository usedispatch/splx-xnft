import {
  ActionCreateInput,
  ActionEntityJson,
  ActionMap,
  ActionParams,
  BufferJson,
  Crud,
  LocalMetadata,
} from '@dispatch-services/db-forum-common/actions';
import { ActiveMap, EntitiesMap } from '@dispatch-services/db-forum-common/pending/types';

import { ApiRequestConfig } from '@dispatch-services/app-forum-store/modules/api/types';
import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleApi } from '@dispatch-services/store/vuestand';
import { ParsedBlockOrder } from '@dispatch-services/db-forum-common/block_order';
import { Pending } from '@dispatch-services/app-forum-store/modules/local_state/types';
import { Scheduler } from '@dispatch-services/utils-common/timers';

export type ThisActions = ModuleApi<
  ModuleActionsState,
  ModuleActionsComputed,
  ModuleActionsGetters,
  ModuleActionsActions
>;

export type This = ThisActions;

interface BaseComposingAction {
  action?: ActionCreateInput<any, any>;
  hash?: string;
  actionId?: string;
  txn?: any;
  pendingId?: string;
}

export interface ComposingAction extends BaseComposingAction {
  action: ActionCreateInput<any, any>;
}

export interface PartiallySignedAction extends BaseComposingAction {
  hash: string;
  actionId: string;
  txn: BufferJson;
}

export interface PendingParams {
  id?: string;
  blockOrder?: string;
  params?: Partial<ActionParams<any>>;
}

export interface PendingMutationInput {
  entities: EntitiesMap;
  actions: ActionMap;
  input: ActionEntityJson[];
  active: ActiveMap;
}

export type PendingPostboxActionParamsValue = Partial<ParsedBlockOrder> & Partial<Pending> & { pendingId?: string };

export interface PendingPostboxActionParams {
  [actionId: string]: PendingPostboxActionParamsValue;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleActionsState {
  scheduledActions: Scheduler;
  createdActionIds: Set<string>;
}

export interface ModuleActionsComputed {
  createdPendingActions: () => ActionEntityJson[];
  hasPendingAction: () => boolean;
  isPolling: () => boolean;
  pendingActions: () => ActionEntityJson[];
  pendingAndErroredActions: () => ActionEntityJson[];
  timedOutActions: () => ActionEntityJson[];
  timedOutActionIds: () => string[];
  pendingActionsRequestConfig: () => ApiRequestConfig;
  pendingActionsRequestKey: () => () => string;
}

export interface ModuleActionsGetters {
  getEntitiesAndActionsFromPendingActions: () => (actionJsonArrayInput: ActionEntityJson[]) => PendingMutationInput;
  getActionsFromRequest: () => (request: ApiRequestConfig, isPost?: boolean) => ActionEntityJson[];
  getActionsMapFromPendingActions: () => (pendingActionJsonArray: ActionEntityJson[]) => ActionMap;
  getActionsRequestConfig: () => (actionIds: string[]) => ApiRequestConfig;
  getActionPostRequestConfig: () => <E extends EntityType, C extends Crud>(
    action: ActionCreateInput<E, C>,
    meta: LocalMetadata
  ) => ApiRequestConfig;
  getActionCancelRequestConfig: () => (actionJson: ActionEntityJson) => ApiRequestConfig;
  getCompletedActions: () => (prev: ActionEntityJson[], curr: ActionEntityJson[]) => ActionEntityJson[];
  getComposedIdFromCreateActionInput: () => (
    params: ActionCreateInput<any, any>,
    type: EntityType,
    crud: Crud
  ) => string;
  getEntitiesFromPendingActions: () => (actions: ActionMap) => EntitiesMap;
  getPendingActionsForChain: () => (chainId: ChainId) => ActionEntityJson[];
  getPendingActionFromEntityId: () => (
    entityId: string,
    actionId?: string,
    pendingPostboxParams?: PendingPostboxActionParams
  ) => ActionEntityJson | undefined;
  getPendingAndCompletedActionInputs: () => (
    curr: ActionEntityJson[],
    completed: ActionEntityJson[]
  ) => {
    pendingInput: PendingMutationInput;
    completedInput: PendingMutationInput;
    pendingIdToCompletedId: { [pendingId: string]: string };
  };
  getPendingActionJson: () => (actionJson: ActionEntityJson) => ActionEntityJson;
  getPendingIdFromEntityId: () => (id: string) => string;
  getPendingPollerKey: () => (creatorId?: string) => string;
  getPendingTimestampFromAction: () => (actionJson: ActionEntityJson) => number;
  getRelatedActionIds: () => (entityId: string) => string[];
  getRelatedIds: () => (actionJson: ActionEntityJson) => string[];
  getRelatedPendingPostboxActionParams: () => (actionJsonArray: ActionEntityJson[]) => PendingPostboxActionParams;
}

export interface ModuleActionsActions {
  _clearCompletedActions: (
    this: This,
    input: PendingMutationInput,
    pendingIdToCompletedId: { [pendingId: string]: string }
  ) => Promise<void>;
  _performRequest: (this: This, request: ApiRequestConfig) => Promise<void>;
  _removePendingActionFromLocalState: (this: This, actionJson: ActionEntityJson, wasError: boolean) => Promise<void>;
  _scheduleRequest: (this: This, request: ApiRequestConfig, delay?: number, id?: string) => Promise<void>;
  get: (this: This) => Promise<void>;
  getCompletedActions: (this: This, actionIds: string[]) => Promise<void>;
  getPendingActions: (this: This) => Promise<void>;
  mutatePendingEntities: (this: This, input: PendingMutationInput, useCurrentEditMap?: boolean) => Promise<void>;
  poll: (this: This) => Promise<void>;
  post: (this: This, request: ActionCreateInput<any, any>) => Promise<void>;
  stopPoller: (this: This, creatorId: string) => Promise<void>;
}
