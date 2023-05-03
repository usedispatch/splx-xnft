import { ModuleAction, useLocalStorage } from '@dispatch-services/store';
import { ModuleWalletActions, ThisWallet as This } from './types';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ThisApi } from '../api/types';
import { createDid } from '@dispatch-services/db-forum-common/entities';
import { getInitialState } from './state';
import { signMessage } from '@dispatch-services/db-forum-common/wallet';
import { tryEachAnimationFrame } from '@dispatch-services/utils-common/timers';

const waitForWalletConnect: ModuleAction<This> = async function () {
  await tryEachAnimationFrame(() => {
    return !!this.state.walletId || this.state.canceledWaitingToConnectWallet;
  }, 1000 * 86400);
  this.setState((state) => {
    state.waitingToConnectWallet = false;
    this.state.canceledWaitingToConnectWallet = false;
  });
};

const setProxyKey: ModuleAction<This> = async function () {
  const walletProxy = this.computed.proxy;
  const key = walletProxy?.proxyKey ?? '';
  const uuid = walletProxy?.uuid ?? '';
  const expires = walletProxy?.expires ?? 0;
  this.setState((state) => {
    state.proxyKey.key = key;
    state.proxyKey.expires = expires;
    state.proxyKey.uuid = uuid;
  });
  await useLocalStorage.actions.set('uuid', uuid);
};

const setWalletAddress: ModuleAction<This> = async function (address: string) {
  this.setState((state) => {
    state.walletId = address;
    state.did = createDid(address);
  });
};

const startWaitForWalletConnect: ModuleAction<This> = async function () {
  this.setState((state) => {
    state.waitingToConnectWallet = true;
    state.canceledWaitingToConnectWallet = false;
  });
};

const cancelWaitForWalletConnect: ModuleAction<This> = async function () {
  if (!this.getters.waitForWalletConnectIsBusy()) {
    return;
  }
  this.setState((state) => {
    state.waitingToConnectWallet = false;
    state.canceledWaitingToConnectWallet = true;
  });
};

const decryptProxyKey: ModuleAction<This> = async function () {
  if (!this.computed.wallet) {
    return;
  }
  const chainId = this.computed.chainId;
  const walletId = this.state.walletId;
  let uuid = this.computed.uuid ?? ((await useLocalStorage.actions.get('uuid')) as string | undefined);
  const message = `Sign in to Solarplex on ${ChainId[chainId]} with wallet:\n\n${walletId}`;
  let signature: string | undefined;
  if (!uuid || this.computed.sessionExpired) {
    signature = await signMessage(this.computed.wallet, message, chainId);
    uuid = undefined;
  }
  const request = this.getters.getProxyKeyConfig(this.computed.userId, chainId, message, signature, uuid);
  await (this.root.api as ThisApi).actions.post(request);
  await this.actions.setProxyKey();
};

const unsetProxyKey: ModuleAction<This> = async function () {
  this.setState((state) => {
    state.proxyKey.key = undefined;
    state.proxyKey.expires = 0;
    state.proxyKey.uuid = undefined;
  });
};

const unsetWalletAddress: ModuleAction<This> = async function () {
  const { did, walletId } = getInitialState();
  this.setState((state) => {
    state.did = did;
    state.walletId = walletId;
  });
  await this.actions.unsetProxyKey();
};

export const actions: ModuleWalletActions = {
  cancelWaitForWalletConnect,
  decryptProxyKey,
  startWaitForWalletConnect,
  setProxyKey,
  setWalletAddress,
  waitForWalletConnect,
  unsetProxyKey,
  unsetWalletAddress,
};
