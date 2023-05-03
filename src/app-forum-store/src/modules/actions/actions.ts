import {
  ActionCreateInput,
  ActionEntityJson,
  ActionRpc,
  createActionJsonFromRpc,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '@dispatch-services/app-forum-store/modules/api';
import { EntityJson, IdDelim, ModelStatus, isActionEntity } from '@dispatch-services/db-forum-common/entities';
import { ModuleAction, useHttp } from '@dispatch-services/store';
import { ModuleActionsActions, PendingMutationInput, ThisActions as This } from './types';

import { AxiosResponse } from '@dispatch-services/utils-common/http';
import { EditMap } from '@dispatch-services/db-forum-common/pending/types';
import { mutatePendingFromAction } from '@dispatch-services/db-forum-common/pending/create';
import { useBlockchain } from '../blockchain';
import { useEntities } from '../entities';
import { useLocalState } from '../local_state';
import { useUser } from '../user';
import { useUserProfile } from '../user_profile';
import { useWallet } from '../wallet';

const prefixKey = '@dispatch-services/app-forum-store/modules/actions/actions#';

function createActionKey(ids: string[], ...methodNames: string[]) {
  return `${prefixKey}${methodNames.join(IdDelim.Join)}#${ids.join(IdDelim.Join)}`;
}

const mutatePendingEntities: ModuleAction<This> = async function ({
  actions,
  entities,
  input,
  active,
}: PendingMutationInput) {
  const missingEntityIds = Object.entries(entities).reduce<string[]>((acc, [key, value]) => {
    if (!value) acc.push(key);
    return acc;
  }, []);

  const edits: EditMap = {};
  Object.values(actions)
    .filter((i) => i.status !== ModelStatus.Active)
    .forEach((actionJson) => {
      mutatePendingFromAction(actionJson, entities, edits, active);
    });
  const createdEntities = missingEntityIds.reduce<Array<EntityJson<any>>>((acc, entityId) => {
    const entity = entities[entityId];
    if (entity && !edits[entityId]) {
      acc.push(entity);
    }
    return acc;
  }, []);
  const actionJsonArray = input.map(({ id }) => actions[id]);
  await useEntities.actions.mutateState({
    inputEntities: createdEntities,
    storeActionKey: createActionKey(
      actionJsonArray.map((i) => i.id),
      'mutatePendingEntities',
      'mutateState'
    ),
  });
  await useLocalState.actions.setLocalPendingState([...actionJsonArray, ...createdEntities], edits);
};

const _clearCompletedActions: ModuleAction<This> = async function (
  { entities, input }: PendingMutationInput,
  pendingIdToCompletedId: { [pendingId: string]: string }
) {
  const actionIds = input.map((i) => i.id);
  const entityIds = Object.keys(entities);
  await useLocalState.actions.removeLocalPendingState(actionIds, entityIds, pendingIdToCompletedId);
};

const getCompletedActions: ModuleAction<This> = async function (actionIds: string[]) {
  const request = this.getters.getActionsRequestConfig(actionIds);
  await useApi.actions.get(request);
};

const getPendingActions: ModuleAction<This> = async function () {
  await this.actions._scheduleRequest(
    this.computed.pendingActionsRequestConfig,
    this.computed.hasPendingAction ? 1000 : 0,
    'getPendingActions'
  );
};

const _scheduleRequest: ModuleAction<This> = async function (
  request: ApiRequestConfig,
  delay: number = 0,
  id?: string
) {
  if (this.state.scheduledActions.inFlight?.id === 'getPendingActions') {
    await this.actions.getPendingActions();
  }
  return await new Promise((resolve) => {
    this.state.scheduledActions.insert(
      async () => {
        await this.actions._performRequest(request);
        resolve();
      },
      delay,
      id
    );
    id !== 'getPendingActions' && this.state.scheduledActions.pushToBack('getPendingActions');
  });
};

const _performRequest: ModuleAction<This> = async function (request: ApiRequestConfig) {
  const isPost = request.method === 'post';
  const currentActions = isPost ? this.getters.getActionsFromRequest(request) : this.computed.pendingActions;
  if (isPost) {
    await useApi.actions.post(request);
  }
  let requestSuccess: AxiosResponse<any, any> | undefined;
  if (!isPost) {
    requestSuccess = await useHttp.actions.get(request);
  }
  const err = isPost ? useApi.getters.postError(request) : useHttp.getters.getError(request);
  if ((err ?? isPost) || !requestSuccess) {
    return;
  }

  const returnedActions = (requestSuccess.data as Array<EntityJson<any>>).filter((i) =>
    isActionEntity(i)
  ) as ActionEntityJson[];
  const returnedPendingActions = returnedActions.filter((i) => i.status === ModelStatus.Pending);
  let completedActions = this.getters.getCompletedActions(currentActions, returnedActions);
  const completedActionsMap = this.getters.getActionsMapFromPendingActions(
    completedActions.map((a) => this.getters.getPendingActionJson(a))
  );

  const completedActionIds = [
    ...new Set([...completedActions.map((i) => i.id), ...Object.values(completedActionsMap).map((i) => i.id)]),
  ];

  let completedActionsSuccess: AxiosResponse<any, any> | undefined;
  if (completedActionIds.length) {
    completedActionsSuccess = await useHttp.actions.get(this.getters.getActionsRequestConfig(completedActionIds));
    // Make sure the completed actions are the newest and up to date.
    completedActions = completedActionsSuccess.data.filter(
      (i) => i.status === ModelStatus.Active && completedActionIds.includes(i.id)
    );
  }

  const { pendingInput, completedInput, pendingIdToCompletedId } = this.getters.getPendingAndCompletedActionInputs(
    returnedActions,
    completedActions
  );

  // Now we want to finally update state once we have both fetched.
  if (requestSuccess && completedActionsSuccess) {
    await useApi.actions.updateStateWithResponse(request, requestSuccess.data);
    await useApi.actions.updateStateWithResponse(
      this.getters.getActionsRequestConfig(completedActionIds),
      completedActionsSuccess.data
    );
    // console.log('clearing', completedActionIds);
    this.setState((state) => {
      completedActionIds.forEach((id) => state.createdActionIds.delete(id));
    });
    await this.actions._clearCompletedActions(completedInput, pendingIdToCompletedId);
    await this.actions.mutatePendingEntities(pendingInput);
  } else if (requestSuccess && !currentActions.length && returnedPendingActions.length) {
    await useApi.actions.updateStateWithResponse(request, requestSuccess.data);
    await this.actions.mutatePendingEntities(pendingInput);
  } else if (requestSuccess && !completedActionsSuccess && !returnedPendingActions.length) {
    await useApi.actions.updateStateWithResponse(request, requestSuccess.data);
  }
};

const _removePendingActionFromLocalState: ModuleAction<This> = async function (
  actionJson: ActionEntityJson,
  wasError: boolean
) {
  const currentPendingActions = this.computed.pendingActions.filter((i) => i.id !== actionJson.id);
  const { pendingInput, completedInput } = this.getters.getPendingAndCompletedActionInputs(currentPendingActions, [
    actionJson,
  ]);
  const { actions, entities } = completedInput;
  this.setState((state) => {
    state.createdActionIds.delete(actionJson.id);
  });
  // If it wasn't an erorr, we don't want to remove the 'Pending' action b/c that will remove the composedId as well.
  await this.actions.mutatePendingEntities(pendingInput, !wasError);
  await useLocalState.actions.removeLocalPendingState(wasError ? Object.keys(actions) : [], Object.keys(entities), {});
};

const get: ModuleAction<This> = async function () {
  // First fetch the actions from the server.
  await this.actions.getPendingActions();
};

const poll: ModuleAction<This> = async function () {
  await this.actions.getPendingActions();
};

const post: ModuleAction<This> = async function (actionCreateInput: ActionCreateInput<any, any>) {
  if (!useWallet.state.walletId) {
    await useWallet.actions.waitForWalletConnect();
    await useUserProfile.actions.getUserProfile(useUser.computed.walletId);
  }
  if (!useWallet.state.walletId) {
    throw new Error('You need to connect your wallet to perform an action.');
  }
  if (useWallet.computed.shouldDecryptProxyKey) {
    await useWallet.actions.decryptProxyKey();
  }
  const chainId = useBlockchain.state.chainId;
  await useLocalState.actions.incrementPendingTime(chainId);
  const { actionId, blockOrder } = useLocalState.getters.getPendingCreateParams(chainId);
  const request = this.getters.getActionPostRequestConfig(actionCreateInput, { actionId });
  const hasSignature = !!request.data?.signature;
  const actionRpc = request.data.action as ActionRpc<any, any>;
  const pendingActionJson = createActionJsonFromRpc(actionRpc, actionId, blockOrder);
  let actionJson = this.getters.getPendingActionJson(pendingActionJson);
  // Create the pending entities for the action.
  const pendingInput = this.getters.getEntitiesAndActionsFromPendingActions([
    ...this.computed.pendingActions,
    actionJson,
  ]);
  // Make sure we don't clobber anything with getting actions from the server (ie, delay doing it)
  if (this.state.scheduledActions.inFlight?.id === 'getPendingActions') {
    await this.actions.getPendingActions();
  }
  await this.actions.mutatePendingEntities(pendingInput);
  // Now do the post.
  await this.actions._scheduleRequest(request);
  let err = useApi.getters.postError(request);
  if (!err) {
    const result = this.getters.getActionsFromRequest(request).find((action) => {
      return action.meta?.actionId === actionId;
    });
    if (result) {
      // Add the id to locallyCreatedActionIds
      this.setState((state) => {
        state.createdActionIds.add(result.id);
      });
      // Associate the pending action id with the action that came back.
      await useLocalState.actions.associateActionWithPendingId(actionId, result);
      if (!hasSignature) {
        await useBlockchain.actions.sendActionToChain(result);
        err = useBlockchain.getters.sendActionToChainError(result);
        if (err) {
          actionJson = result;
        }
      }
    }
  }
  // Remove the pending action.
  await this.actions._removePendingActionFromLocalState(pendingActionJson, !!err);
  if (err) {
    // Then remove the pending local state for the action.
    // Note(Partyman): Will want to pay attention to error codes and only remove failed action for canceled txns.
    await this.actions._removePendingActionFromLocalState(this.getters.getPendingActionJson(actionJson), !!err);
    // Cancel the request on the server.
    !hasSignature && (await this.actions._performRequest(this.getters.getActionCancelRequestConfig(actionJson)));
  }
};

const stopPoller: ModuleAction<This> = async function (creatorId: string) {
  await this.state.scheduledActions.clear();
};

export const actions: ModuleActionsActions = {
  _clearCompletedActions,
  _performRequest,
  _removePendingActionFromLocalState,
  _scheduleRequest,
  get,
  getCompletedActions,
  getPendingActions,
  mutatePendingEntities,
  poll,
  post,
  stopPoller,
};

/**
// Note(Partyman): Just keeping this here for debugging.
function printStateChanges() {
  let currLocalState = '';
  let currEntityState = '';
  function printLocalState() {
    const localState = JSON.stringify(
      globalThis['@dispatch-services/singletonRegistry']['@dispatch-services/state/vuestand/module#storeRoot']
        .localState.state
    );
    if (localState !== currLocalState) {
      currLocalState = localState;
      console.log('local', JSON.parse(currLocalState));
    }
    const entityState = JSON.stringify(
      globalThis['@dispatch-services/singletonRegistry']['@dispatch-services/state/vuestand/module#storeRoot'].entities
        .state
    );
    if (entityState !== currEntityState) {
      currEntityState = entityState;
      console.log('entities', JSON.parse(currEntityState));
    }
  }
  function printLocalStateRaf() {
    globalThis.requestAnimationFrame(() => {
      printLocalState();
      printLocalStateRaf();
    });
  }
  printLocalStateRaf();
}
*/
