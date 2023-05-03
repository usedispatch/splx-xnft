import { ApiRequestConfig, useApi } from '../api';
import { ModelStatus, isActionEntity } from '@dispatch-services/db-forum-common/entities';
import { ModuleActionsComputed, ThisActions as This } from './types';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions';
import { ModuleComputed } from '@dispatch-services/store';
import { useEntities } from '../entities';
import { useUser } from '../user';

const pendingActionsRequestConfig: ModuleComputed<This> = function (): ApiRequestConfig {
  const creatorId = useUser.computed.userId ?? '';
  return {
    baseURL: useApi.computed.baseUrl,
    url: '/action/pending/:entityId',
    method: 'get',
    subDirectories: {
      entityId: creatorId,
    },
  };
};

const pendingActionsRequestKey: ModuleComputed<This> = function () {
  return useApi.getters.getActionKey(this.computed.pendingActionsRequestConfig);
};

const pendingAndErroredActions: ModuleComputed<This> = function () {
  const actionsFromServer = useApi.getters
    .getResponse(this.computed.pendingActionsRequestConfig)
    .filter((i) => isActionEntity(i));
  const map = actionsFromServer.reduce<{ [id: string]: number }>((acc, action) => {
    if (!acc[action.id]) {
      acc[action.id] = 0;
    }
    acc[action.id]++;
    return acc;
  }, {});
  const localActions = this.computed.createdPendingActions.reduce<ActionEntityJson[]>((acc, action) => {
    if (!map[action.id]) {
      map[action.id] = 0;
      acc.push(action);
    }
    map[action.id]++;
    return acc;
  }, []);
  return [...actionsFromServer, ...localActions];
};

const createdPendingActions: ModuleComputed<This> = function () {
  const actions = useEntities.getters.getEntity(Array.from(this.state.createdActionIds)) as Array<
    ActionEntityJson | undefined
  >;
  return actions.filter((i) => i?.status === ModelStatus.Pending);
};

const pendingActions: ModuleComputed<This> = function () {
  return this.computed.pendingAndErroredActions.filter((i) => i.status === ModelStatus.Pending);
};

const timedOutActions: ModuleComputed<This> = function () {
  return this.computed.pendingAndErroredActions.filter((i) => i.status === ModelStatus.Pending);
};

const timedOutActionIds: ModuleComputed<This> = function () {
  return this.computed.timedOutActions.map((action) => action.id);
};

const hasPendingAction: ModuleComputed<This> = function () {
  return !!this.computed.pendingActions.length;
};

const isPolling: ModuleComputed<This> = function () {
  return !this.state.scheduledActions.isIdle;
};

export const computed: ModuleActionsComputed = {
  createdPendingActions,
  isPolling,
  pendingActions,
  pendingAndErroredActions,
  pendingActionsRequestConfig,
  pendingActionsRequestKey,
  timedOutActions,
  timedOutActionIds,
  hasPendingAction,
};
