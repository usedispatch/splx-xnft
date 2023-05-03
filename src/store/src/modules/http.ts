import { AxiosError, RequestConfig, get, post } from '@dispatch-services/utils-common/http';

import { create } from '@dispatch-services/store/vuestand';
import { omit } from '@dispatch-services/utils-common/json';

interface ActionRequestConfig extends RequestConfig {
  storeActionKey?: string;
}

function onHttpError(error: AxiosError, config: RequestConfig) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { status } = error.response;
    if (status === 401 && config.token) {
      console.warn('Make sure we unset the JWT here!!');
    }
    // If this is client side, update the server time here.
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
  } else {
    // Something happened in setting up the request that triggered an Error
  }
}

function normalizeConfig(inputConfig: ActionRequestConfig, baseUrl: string) {
  const config = JSON.parse(JSON.stringify(omit(inputConfig, 'errorHandler')));
  config.errorHandler = inputConfig.errorHandler ?? onHttpError;
  config.baseURL = config.baseURL ?? baseUrl;
  config.storeActionKey = JSON.stringify(omit(config, 'errorHandler'));
  if (inputConfig.data) {
    config.data = inputConfig.data;
  }
  return config;
}

export const useHttp = create(() => ({
  name: 'http',
  state: {
    baseUrl: '',
  },
  actions: {
    async setBaseUrl(baseUrl: string) {
      this.setState((state) => {
        state.baseUrl = baseUrl;
      });
    },
    async get(config: RequestConfig) {
      const response = await get(normalizeConfig(config, this.state.baseUrl));
      await this.root.time.actions.updateServerTime(response.headers);
      return response;
    },
    async post(config: RequestConfig) {
      const response = await post(normalizeConfig(config, this.state.baseUrl));
      await this.root.time.actions.updateServerTime(response.headers);
      return response;
    },
  },
}));
