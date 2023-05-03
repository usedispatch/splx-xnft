import {
  ActionCreateInput,
  ActionRpc,
  BaseJson,
  Crud,
  ProfileActionParams,
  ProfileJson,
  TwitterProfileActionParams,
  UserSettingsActionParams,
  UserSettingsJson,
} from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisUserProfile = ModuleApi<
  ModuleUserProfileState,
  ModuleUserProfileComputed,
  ModuleUserProfileGetters,
  ModuleUserProfileActions
>;
type This = ThisUserProfile;

export type ProfileDisplayType = 'twitter' | 'wallet';
export interface ProfileDisplayParams {
  type: ProfileDisplayType;
  displayName: string;
  displayWallet: string;
  image: string;
  wallet: string;
}
export interface ModuleUserProfileState {
  pendingPreferWalletPopups: boolean | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleUserProfileComputed {
  preferWalletPopups: () => boolean;
  profileId: () => string;
  profile: () => EntityJson<EntityType.Profile> | undefined;
  userSettings: () => UserSettingsJson | undefined;
  userSettingsId: () => string;
}

export interface ModuleUserProfileGetters {
  getCreateProfileCreateActionInput: () => (
    params: TwitterProfileActionParams
  ) => ActionCreateInput<EntityType.Profile, Crud.Post>;
  getDisconnectTwitterCreateActionInput: () => () => ActionCreateInput<EntityType.Profile, Crud.Put>;
  getEditProfileCreateActionInput: () => (
    params: Partial<ProfileActionParams>
  ) => ActionCreateInput<EntityType.Profile, Crud.Put>;
  getUserProfile: () => (userId: string) => ProfileJson | undefined;
  getUserSettingsRequestConfig: () => (
    rpc: ActionRpc<EntityType.UserSettings, any>,
    signature: string
  ) => ApiRequestConfig;
  getProfileDisplayParams: () => <B extends BaseJson>(entityJson: B) => ProfileDisplayParams;
  getUserLeaderboardResponse: () => () => BaseJson[];
  getUserLeaderboardRequestConfig: () => () => ApiRequestConfig;
  getUserScore: () => (userId: string) => number;
  getUserSettingsRpc: () => (params: UserSettingsActionParams) => ActionRpc<EntityType.UserSettings, any>;
  getUserProfileRequestConfig: () => (walletId: string) => ApiRequestConfig;
  getUserProfileResponse: () => (walletId: string) => ProfileJson;
}

export interface ModuleUserProfileActions {
  connectTwitter: (this: This, params: TwitterProfileActionParams) => Promise<void>;
  createProfile: (this: This, params: TwitterProfileActionParams) => Promise<void>;
  disconnectTwitter: (this: This) => Promise<void>;
  editProfile: (this: This, params: Partial<ProfileActionParams>) => Promise<void>;
  editUserSettings: (this: This, params: UserSettingsActionParams, userId?: string) => Promise<void>;
  getUserProfile: (this: This, walletId: string) => Promise<void>;
  getUserLeaderboard: (this: This) => Promise<void>;
}
