import { ModuleAction, usePollers } from '@dispatch-services/store';
import { ModuleNotificationsActions, ThisNotifications as This } from './types';

import { signActionRpc } from '@dispatch-services/db-forum-common/proxy_wallet';
import { signMessage } from '@dispatch-services/db-forum-common/wallet';
import { useApi } from '../api';
import { useBlockchain } from '../blockchain';
import { useUser } from '../user';
import { useWallet } from '../wallet';

const fetchNotifications: ModuleAction<This> = async function (creatorId: string) {
  if (this.computed.markingRead || !useUser.computed.userId) {
    return;
  }
  const config = this.getters.getNotificationsRequestConfig(creatorId);
  await useApi.actions.get(config);
};

const markRead: ModuleAction<This> = async function (creatorId: string) {
  const rpc = this.getters.getMarkReadRpc();
  if (!rpc) {
    return;
  }
  this.setState((state) => {
    state.markingReadId = rpc.action.params.lastReadId as string;
  });
  if (useWallet.computed.shouldDecryptProxyKey) {
    await useWallet.actions.decryptProxyKey();
  }
  try {
    const signature = useWallet.computed.proxyKey
      ? signActionRpc(rpc, useWallet.computed.proxyKey)
      : await signMessage(useBlockchain.state.wallet, JSON.stringify(rpc), rpc.chainId);
    if (signature) {
      // If already fetching notifications, wait for it to finsh before marking them as read.
      if (this.getters.fetchNotificationsIsBusy(creatorId)) {
        await this.actions.fetchNotifications(creatorId);
      }
      const config = this.getters.getMarkReadRequestConfig(rpc, signature);
      await useApi.actions.post(config);
    }
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    this.setState((state) => {
      state.markingReadId = '';
    });
  }
};

const stopPoller: ModuleAction<This> = async function (creatorId: string) {
  if (!creatorId) {
    return;
  }
  await usePollers.actions.stopPoller(this.getters.getNotificationsPollerKey(creatorId));
};

const startPoller: ModuleAction<This> = async function (creatorId: string) {
  if (!creatorId || !useUser.computed.userId) {
    return;
  }
  void usePollers.actions.startPoller({
    pollerKey: this.getters.getNotificationsPollerKey(creatorId),
    pollTime: 60 * 1000,
    backoff: 1,
    onPollCallback: async () => {
      await this.actions.fetchNotifications(creatorId);
      return !!useUser.computed.userId;
    },
  });
};

export const actions: ModuleNotificationsActions = {
  fetchNotifications,
  markRead,
  startPoller,
  stopPoller,
};
