import { ApiRequestConfig, ModuleApiGetters, ThisApi as This } from './types';
import { ModuleGetter, useTime } from '@dispatch-services/store';

import { useEntities } from '@dispatch-services/app-forum-store/modules/entities';

const getResponse: ModuleGetter<This> = function () {
  return (request: ApiRequestConfig) => {
    const requestKey =
      request.method === 'post' ? this.getters.postActionKey(request) : this.getters.getActionKey(request);
    const results = this.state.results[requestKey];
    return useEntities.getters.getEntity(results?.responseIds ?? []);
  };
};

const isRequestTooEarly: ModuleGetter<This> = function () {
  return (request: ApiRequestConfig) => {
    if (!request.cacheTime) {
      return false;
    }
    // TODO(Partyman): this is for 'gets' only, so make a better name to denote that.
    const lastRequest = this.state.results[this.getters.getActionKey(request)]?.time ?? 0;
    return (useTime.computed.serverTime - lastRequest) * 1000 > request.cacheTime;
  };
};

export const getters: ModuleApiGetters = {
  getResponse,
  isRequestTooEarly,
};
