import { ApiRequestConfig, ThisApi } from '../api/types';
import { ModuleWalletGetters, ThisWallet as This } from './types';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ModuleGetter } from '@dispatch-services/store';

const getProxyKeyConfig: ModuleGetter<This> = function () {
  return (
    creatorId: string,
    chainId: ChainId,
    message: string,
    signature?: string,
    uuid?: string
  ): ApiRequestConfig => {
    const config: ApiRequestConfig = {
      baseURL: (this.root.api as ThisApi).computed.baseUrl,
      method: 'post',
      url: '/wallet/proxy/:creatorId',
      subDirectories: {
        creatorId,
      },
      data: {
        chainId,
        signature,
        message,
        uuid,
      },
    };
    return config;
  };
};

export const getters: ModuleWalletGetters = {
  getProxyKeyConfig,
};
