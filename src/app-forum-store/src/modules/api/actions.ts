import { ApiRequestConfig, ModuleApiActions, ThisApi as This } from './types';
import { ModuleAction, useHttp, useTime } from '@dispatch-services/store';

import { EntityJson } from '@dispatch-services/db-forum-common/entities';
import { useEntities } from '@dispatch-services/app-forum-store/modules/entities';

const prefixKey = '@dispatch-services/app-forum-store/modules/api/actions#';

function responseToIds(data: Array<EntityJson<any>>) {
  return data.reduce<string[]>((acc, i) => {
    acc.push(useEntities.getters.getEntityId(i));
    return acc;
  }, []);
}

async function updateEntities(data: Array<EntityJson<any>>, actionKey: string) {
  await useEntities.actions.mutateState({
    inputEntities: data,
    storeActionKey: `${prefixKey}${actionKey}`,
  });
  return responseToIds(data);
}

const updateStateWithResponse: ModuleAction<This> = async function (
  request: ApiRequestConfig,
  responseData: Array<EntityJson<any>>,
  resultsKey: string
) {
  const actionKey =
    request.method === 'post' ? this.getters.postActionKey(request) : this.getters.getActionKey(request);
  const responseIds = await updateEntities(responseData, actionKey);
  this.setState((state) => {
    state.results[resultsKey ?? actionKey] = {
      time: useTime.computed.serverTime,
      responseIds,
    };
  });
};

const get: ModuleAction<This> = async function (request: ApiRequestConfig, resultsKey?: string) {
  if (this.getters.isRequestTooEarly(request)) {
    return;
  }
  const success = await useHttp.actions.get(request);
  await this.actions.updateStateWithResponse(request, success.data, resultsKey);
};

const post: ModuleAction<This> = async function (request: ApiRequestConfig, resultsKey?: string) {
  const success = await useHttp.actions.post(request);
  await this.actions.updateStateWithResponse(request, success.data, resultsKey);
};

export const actions: ModuleApiActions = {
  get,
  post,
  updateStateWithResponse,
};
