import { ModuleUserProfileActions, ThisUserProfile as This } from './types';
import {
  ProfileActionParams,
  TwitterProfileActionParams,
  UserSettingsActionParams,
} from '@dispatch-services/db-forum-common/actions';

import { ModuleAction } from '@dispatch-services/store';
import { signActionRpc } from '@dispatch-services/db-forum-common/proxy_wallet';
import { signMessage } from '@dispatch-services/db-forum-common/wallet';
import { useActions } from '../actions';
import { useApi } from '../api';
import { useBlockchain } from '../blockchain';
import { useImage } from '../image';
import { useUser } from '../user';
import { useWallet } from '../wallet';

const createProfile: ModuleAction<This> = async function (params: TwitterProfileActionParams) {
  const body = this.getters.getCreateProfileCreateActionInput(params);
  await useActions.actions.post(body);
};

const editProfile: ModuleAction<This> = async function (params: ProfileActionParams) {
  const body = this.getters.getEditProfileCreateActionInput(params);
  await useActions.actions.post(body);
};

const connectTwitter: ModuleAction<This> = async function (params: TwitterProfileActionParams) {
  // image: string, twitter: string, twitterUserId: string
  const profile = this.getters.getUserProfile(useUser.computed.userId);
  await useImage.actions.uploadImageFromUrl(params.image);
  params = { ...params, ...{ image: useImage.getters.getImageUrl(params.image) } };
  if (!profile) {
    await this.actions.createProfile(params);
  } else {
    await this.actions.editProfile(params);
  }
};

const disconnectTwitter: ModuleAction<This> = async function () {
  const body = this.getters.getDisconnectTwitterCreateActionInput();
  await useActions.actions.post(body);
};

const editUserSettings: ModuleAction<This> = async function (settings: UserSettingsActionParams, userId?: string) {
  const rpc = this.getters.getUserSettingsRpc(settings);
  if (useWallet.computed.shouldDecryptProxyKey) {
    await useWallet.actions.decryptProxyKey();
  }
  const signature = useWallet.computed.proxyKey
    ? signActionRpc(rpc, useWallet.computed.proxyKey)
    : await signMessage(useBlockchain.state.wallet, JSON.stringify(rpc), rpc.chainId);
  const config = this.getters.getUserSettingsRequestConfig(rpc, signature);
  this.setState((state) => {
    state.pendingPreferWalletPopups = settings.preferWalletPopups;
  });
  await useApi.actions.post(config);
  this.setState((state) => {
    state.pendingPreferWalletPopups = undefined;
  });
};

const getUserProfile: ModuleAction<This> = async function (walletId: string) {
  const config = this.getters.getUserProfileRequestConfig(walletId);
  await useApi.actions.get(config);
};

const getUserLeaderboard: ModuleAction<This> = async function () {
  const config = this.getters.getUserLeaderboardRequestConfig();
  await useApi.actions.get(config);
};

export const actions: ModuleUserProfileActions = {
  connectTwitter,
  createProfile,
  disconnectTwitter,
  editProfile,
  editUserSettings,
  getUserLeaderboard,
  getUserProfile,
};
