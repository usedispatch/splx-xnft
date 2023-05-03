import {
  EntityJson,
  EntityType,
  createDid,
  generateUserId,
  generateWalletProxyId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleComputed, useTime } from '@dispatch-services/store';
import { ModuleWalletComputed, ThisWallet as This } from './types';
import { canUseProxyWallet, getActionCost } from '@dispatch-services/db-forum-common/proxy_wallet';

import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ThisActions } from '../actions/types';
import { ThisBlockchain } from '../blockchain/types';
import { ThisEntities } from '../entities';
import { ThisUserProfile } from '../user_profile/types';

const hasFunds: ModuleComputed<This> = function (): boolean {
  return !!this.computed.proxyKey && !!this.computed.actionsRemaining;
};

const actionsRemaining: ModuleComputed<This> = function (): number {
  const chainId = this.computed.chainId;
  const costPerAction = getActionCost(chainId);
  const numPending = (this.root.actions as ThisActions).getters.getPendingActionsForChain(chainId).length;
  const fundsRemaining = this.computed.fundsRemaining;
  return Math.max((fundsRemaining - numPending * costPerAction) / costPerAction, 0);
};

const chainId: ModuleComputed<This> = function (): ChainId {
  return (this.root.blockchain as ThisBlockchain).state.chainId ?? ChainId.Unknown;
};

const fundsRemaining: ModuleComputed<This> = function (): number {
  const chainId = this.computed.chainId;
  return this.computed.profile?.funds[chainId] ?? 0;
};

const profile: ModuleComputed<This> = function (): EntityJson<EntityType.Profile> | undefined {
  return (this.root.userProfile as ThisUserProfile).computed.profile;
};

const proxy: ModuleComputed<This> = function (): EntityJson<EntityType.WalletProxy> | undefined {
  return (this.root.entities as ThisEntities).getters.getEntity(
    generateWalletProxyId(this.computed.chainId, this.computed.userId)
  ) as EntityJson<EntityType.WalletProxy> | undefined;
};

const proxyPublicKey: ModuleComputed<This> = function (): string {
  return this.computed.profile?.proxyKeys[this.computed.chainId]?.[0] ?? '';
};

const proxyKey: ModuleComputed<This> = function (): string | undefined {
  if (this.computed.sessionExpired) {
    return;
  }
  return this.state.proxyKey.key;
};

const sessionExpired: ModuleComputed<This> = function (): boolean {
  return useTime.computed.serverTimeSec > (this.computed.proxy?.expires ?? 0);
};

const shouldDecryptProxyKey: ModuleComputed<This> = function (): boolean {
  return (
    !!this.computed.proxyPublicKey && !this.computed.proxyKey && !!this.computed.actionsRemaining && canUseProxyWallet()
  );
};

const userId: ModuleComputed<This> = function (): string {
  if (!this.state.walletId) {
    return '';
  }
  return generateUserId(createDid(this.state.walletId));
};

const uuid: ModuleComputed<This> = function (): string | undefined {
  return this.state.proxyKey.uuid;
};

const wallet: ModuleComputed<This> = function () {
  return (this.root.blockchain as ThisBlockchain).state.wallet;
};

export const computed: ModuleWalletComputed = {
  chainId,
  hasFunds,
  actionsRemaining,
  fundsRemaining,
  profile,
  proxy,
  proxyPublicKey,
  proxyKey,
  sessionExpired,
  shouldDecryptProxyKey,
  userId,
  uuid,
  wallet,
};
