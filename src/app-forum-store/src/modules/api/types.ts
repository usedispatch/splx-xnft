import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ModuleApi } from '@dispatch-services/store/vuestand';
import { RequestConfig } from '@dispatch-services/utils-common/http';

export type ThisApi = ModuleApi<ModuleApiState, ModuleApiComputed, ModuleApiGetters, ModuleApiActions>;
type This = ThisApi;

export interface ApiRequestConfig extends RequestConfig {
  actionKey?: string;
  cacheTime?: number; // Do not refetch within cacheTime ms.
  timeout?: number; // Do not wait longer than timeout for a response.
}

// Need to define what is returned by the api.
export interface ApiResult {
  time: number; // Server Time for when the result was fetched.
  responseIds: string[]; // Response will always be an array of EntityJsonResponses, but we turn those into ids.
}

export interface ApiResults {
  [actionKey: string]: ApiResult;
}

export interface ModuleApiState {
  results: ApiResults;
}

export interface ModuleApiComputed {
  baseUrl: () => string;
}

export interface ModuleApiGetters {
  getResponse: () => <T extends EntityType>(request: ApiRequestConfig) => Array<EntityJson<T>>;
  isRequestTooEarly: () => (request: ApiRequestConfig) => boolean;
}

export interface ModuleApiActions {
  get: (this: This, request: ApiRequestConfig, resultsKey?: string) => Promise<void>;
  post: (this: This, request: ApiRequestConfig, resultsKey?: string) => Promise<void>;
  updateStateWithResponse: (
    this: This,
    request: ApiRequestConfig,
    responseData: Array<EntityJson<any>>,
    resultsKey?: string
  ) => Promise<void>;
}
