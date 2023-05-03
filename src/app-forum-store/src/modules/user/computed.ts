import { ModuleUserComputed, ThisUser as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';
import { generateProfileId } from '@dispatch-services/db-forum-common/entities';
import { useWallet } from '../wallet';

const profileId: ModuleComputed<This> = function () {
  return this.computed.userId ? generateProfileId(this.computed.userId) : '';
};

const userId: ModuleComputed<This> = function () {
  return useWallet.computed.userId;
};

const walletId: ModuleComputed<This> = function () {
  return useWallet.state.walletId;
};

export const computed: ModuleUserComputed = {
  profileId,
  userId,
  walletId,
};
