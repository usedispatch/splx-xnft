import { ModuleNftGetters, ThisNft as This } from './types';

import { ApiRequestConfig } from '../api';
import { ModuleGetter } from '@dispatch-services/store';

const getClaimAction: ModuleGetter<This> = function () {
  return () => {
    return 0;
  };
};

const getNftMintAddressConfig: ModuleGetter<This> = function () {
  return (walletAddress: string) => {
    const config: ApiRequestConfig = {
      baseURL: process.env.UNDERDOG_API_URL,
      url: '/v2/projects/n/:projectId/nfts/search',
      subDirectories: {
        projectId: process.env.UNDERDOG_PROJECT_ID,
      },
      params: {
        search: walletAddress,
      },
      headers: {
        Authorization: `Bearer ${process.env.UNDERDOG_API_KEY ?? ''}`,
      },
    };
    return config;
  };
};

const getClaimTransactionConfig: ModuleGetter<This> = function () {
  return (walletAddress: string, mintAddress: string) => {
    const config: ApiRequestConfig = {
      baseURL: process.env.UNDERDOG_API_URL,
      url: '/v2/nfts/:mintAddress/claim',
      subDirectories: {
        mintAddress,
      },
      data: {
        claimerAddress: walletAddress,
      },
    };
    return config;
  };
};

export const getters: ModuleNftGetters = {
  getClaimAction,
  getNftMintAddressConfig,
  getClaimTransactionConfig,
};
