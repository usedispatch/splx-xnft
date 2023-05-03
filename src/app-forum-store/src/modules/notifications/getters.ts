import {
  ActionCreateInput,
  ActionParams,
  ActionRpc,
  Crud,
  createActionRpc,
} from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '../api';
import { EntityJson, EntityType, getTypeFromId } from '@dispatch-services/db-forum-common/entities';
import { ModuleNotificationsGetters, ThisNotifications as This } from './types';

import { ModuleGetter } from '@dispatch-services/store';
import { useBlockchain } from '../blockchain';
import { useEntities } from '../entities';
import { useUser } from '../user';

const getNotifications: ModuleGetter<This> = function () {
  return (creatorId: string) => {
    const requestConfig = this.getters.getNotificationsRequestConfig(creatorId);
    return useApi.getters.getResponse(requestConfig).filter((i) => getTypeFromId(i.id) === EntityType.Notification);
  };
};

const isUnread: ModuleGetter<This> = function () {
  return (notificationIdOrJson: string | EntityJson<EntityType.Notification>) => {
    const notification =
      typeof notificationIdOrJson === 'string'
        ? (useEntities.getters.getEntity(notificationIdOrJson) as EntityJson<EntityType.Notification> | undefined)
        : notificationIdOrJson;
    return this.computed.lastRead < (notification?.blockOrder ?? '');
  };
};

const getNotificationsRequestConfig: ModuleGetter<This> = function () {
  return (creatorId?: string): ApiRequestConfig => {
    creatorId = creatorId ?? useUser.computed.userId ?? '';
    return {
      baseURL: useApi.computed.baseUrl,
      url: '/notifications/:creatorId',
      method: 'get',
      subDirectories: {
        creatorId,
      },
    };
  };
};

const getMarkReadRpc: ModuleGetter<This> = function () {
  return (): ActionRpc<EntityType.NotificationRead, Crud.Put> | undefined => {
    if (!this.computed.latestNotificationId) {
      return;
    }
    const creatorId = useUser.computed.userId;
    const walletId = useUser.computed.walletId;
    const params: ActionParams<EntityType.NotificationRead> = { lastReadId: this.computed.latestNotificationId };
    const action: ActionCreateInput<EntityType.NotificationRead, Crud.Put> = {
      crud: Crud.Put,
      params,
      type: EntityType.NotificationRead,
      crudEntityId: this.computed.notificationRead?.id ?? '',
    };
    return createActionRpc(
      creatorId,
      walletId,
      useBlockchain.state.chainId,
      EntityType.NotificationRead,
      Crud.Put,
      action
    );
  };
};

const getMarkReadRequestConfig: ModuleGetter<This> = function () {
  return (rpc: ActionRpc<EntityType.NotificationRead, Crud.Put>, signature: string): ApiRequestConfig => {
    const { creatorId, chainId } = rpc;
    const message = JSON.stringify(rpc);
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      method: 'post',
      url: '/notifications/:creatorId',
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

const getNotificationsPollerKey: ModuleGetter<This> = function () {
  return (creatorId: string) => {
    return `notifications-${creatorId}`;
  };
};

export const getters: ModuleNotificationsGetters = {
  getMarkReadRequestConfig,
  getMarkReadRpc,
  getNotifications,
  getNotificationsPollerKey,
  getNotificationsRequestConfig,
  isUnread,
};
