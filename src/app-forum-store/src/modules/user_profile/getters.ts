import {
  ActionCreateInput,
  ActionParams,
  ActionRpc,
  BaseJson,
  CountUserJson,
  Crud,
  ProfileActionParams,
  ProfileJson,
  TwitterProfileActionParams,
  UserSettingsActionParams,
  createActionRpc,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '../api';
import { EntityType, generateCountUserId, generateProfileId } from '@dispatch-services/db-forum-common/entities';
import { ModuleUserProfileGetters, ProfileDisplayParams, ThisUserProfile as This } from './types';

import { ModuleGetter } from '@dispatch-services/store';
import { getChainIdFromEnv } from '@dispatch-services/db-forum-common/chain';
import { truncateAddress } from '@dispatch-services/db-forum-common/wallet';
import { useBlockchain } from '../blockchain';
import { useEntities } from '../entities';
import { useUser } from '../user';

const getCreateProfileCreateActionInput: ModuleGetter<This> = function () {
  return (inputParams: TwitterProfileActionParams) => {
    const params: ActionParams<EntityType.Profile> = {
      name: '',
      ...inputParams,
    };
    if (!params.parentId) {
      params.parentId = useUser.computed.userId;
    }
    if (!params.image || !params.twitter || !params.twitterUserId || !params.secret) {
      return this.getters.getDisconnectTwitterCreateActionInput();
    }
    const profileEditActionBody: ActionCreateInput<EntityType.Profile, Crud.Post> = {
      crud: Crud.Post,
      type: EntityType.Profile,
      parentId: params.parentId,
      params,
    };
    return profileEditActionBody;
  };
};

const getDisconnectTwitterCreateActionInput: ModuleGetter<This> = function () {
  return () => {
    const params: Partial<ActionParams<EntityType.Profile>> = {
      parentId: useUser.computed.userId,
      disconnect: true,
    };
    const profileId = generateProfileId(useUser.computed.userId);
    const profileEditActionBody: ActionCreateInput<EntityType.Profile, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Profile,
      crudEntityId: profileId,
      params,
    };
    return profileEditActionBody;
  };
};

const getEditProfileCreateActionInput: ModuleGetter<This> = function () {
  return (inputParams: Partial<ProfileActionParams>) => {
    const params: Partial<ActionParams<EntityType.Profile>> = {
      parentId: useUser.computed.userId,
    };
    Object.entries(inputParams).reduce<typeof params>((acc, [key, value]) => {
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, params);
    const profileId = generateProfileId(useUser.computed.userId);
    const profileEditActionBody: ActionCreateInput<EntityType.Profile, Crud.Put> = {
      crud: Crud.Put,
      type: EntityType.Profile,
      crudEntityId: profileId,
      params,
    };
    return profileEditActionBody;
  };
};

const getUserProfile: ModuleGetter<This> = function () {
  return (userId: string) => {
    const profileId = generateProfileId(userId);
    return useEntities.getters.getEntity(profileId) as ProfileJson;
  };
};

const getUserScore: ModuleGetter<This> = function () {
  return (userId: string): number => {
    const countId = generateCountUserId(userId, getChainIdFromEnv(process.env.ACTIVE_CHAIN as string));
    return (useEntities.getters.getEntity(countId) as CountUserJson | undefined)?.score ?? 0;
  };
};

const getProfileDisplayParams: ModuleGetter<This> = function () {
  return <B extends BaseJson>(entityJson: B): ProfileDisplayParams => {
    const userProfile = this.getters.getUserProfile(entityJson.creatorId);
    if (!userProfile) {
      return {
        type: 'wallet',
        wallet: entityJson.wallet,
        displayWallet: truncateAddress(entityJson.wallet),
        displayName: entityJson.wallet,
        image: '',
      };
    }
    const profileDisplayParams: ProfileDisplayParams = {
      image: userProfile.image,
      type: 'wallet',
      wallet: userProfile.wallet,
      displayWallet: truncateAddress(userProfile.wallet),
      displayName: userProfile.wallet,
    };
    const image = useEntities.getters.getEntityParam(userProfile, 'image' as any);
    const twitter = useEntities.getters.getEntityParam(userProfile, 'twitter' as any);

    profileDisplayParams.image = image as string;
    if (twitter) {
      profileDisplayParams.displayName = twitter as string;
      profileDisplayParams.type = 'twitter';
    }

    return profileDisplayParams;
  };
};

const getUserLeaderboardRequestConfig: ModuleGetter<This> = function () {
  return () => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      method: 'get',
      url: '/leaderboard/user/score',
    };
    return config;
  };
};

const getUserSettingsRpc: ModuleGetter<This> = function () {
  return (params: UserSettingsActionParams): ActionRpc<EntityType.UserSettings, any> => {
    const creatorId = useUser.computed.userId;
    const walletId = useUser.computed.walletId;
    const crud: Crud = this.computed.userSettings ? Crud.Put : Crud.Post;
    const action: ActionCreateInput<EntityType.UserSettings, typeof crud> = {
      crud,
      params,
      type: EntityType.UserSettings,
      crudEntityId: crud === Crud.Post ? undefined : this.computed.userSettingsId,
      parentId: crud === Crud.Post ? creatorId : undefined,
    };
    return createActionRpc(creatorId, walletId, useBlockchain.state.chainId, EntityType.UserSettings, crud, action);
  };
};

const getUserSettingsRequestConfig: ModuleGetter<This> = function () {
  return (rpc: ActionRpc<EntityType.UserSettings, any>, signature: string): ApiRequestConfig => {
    const { creatorId, chainId } = rpc;
    const message = JSON.stringify(rpc);
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      method: 'post',
      url: '/settings/:creatorId',
      subDirectories: {
        creatorId,
      },
      data: {
        chainId,
        signature,
        message,
      },
    };
    return config;
  };
};

const getUserProfileRequestConfig: ModuleGetter<This> = function () {
  return (walletId: string) => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      method: 'get',
      url: '/entities/profile/:address',
      subDirectories: {
        address: walletId,
      },
    };
    return config;
  };
};

const getUserProfileResponse: ModuleGetter<This> = function () {
  return (walletId: string) => {
    const config = this.getters.getUserProfileRequestConfig(walletId);
    const entities = useApi.getters.getResponse(config);
    return entities;
  };
};

const getUserLeaderboardResponse: ModuleGetter<This> = function () {
  return () => {
    const config = this.getters.getUserLeaderboardRequestConfig();
    const entities = useApi.getters.getResponse(config);
    return entities;
  };
};
export const getters: ModuleUserProfileGetters = {
  getCreateProfileCreateActionInput,
  getDisconnectTwitterCreateActionInput,
  getEditProfileCreateActionInput,
  getUserSettingsRequestConfig,
  getProfileDisplayParams,
  getUserLeaderboardResponse,
  getUserLeaderboardRequestConfig,
  getUserProfile,
  getUserScore,
  getUserSettingsRpc,
  getUserProfileRequestConfig,
  getUserProfileResponse,
};
