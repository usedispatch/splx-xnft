import { ActionRpc, Crud } from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisNotifications = ModuleApi<
  ModuleNotificationsState,
  ModuleNotificationsComputed,
  ModuleNotificationsGetters,
  ModuleNotificationsActions
>;
type This = ThisNotifications;

export interface ModuleNotificationsState {
  markingReadId: string; // Id that is being marked as read.
}

export interface ModuleNotificationsComputed {
  lastRead: () => string;
  latestNotification: () => EntityJson<EntityType.Notification> | undefined;
  latestNotificationId: () => string;
  markingRead: () => boolean;
  markingReadUserId: () => string;
  notificationRead: () => EntityJson<EntityType.NotificationRead> | undefined;
  notifications: () => Array<EntityJson<EntityType.Notification>>;
  unreadNotifications: () => Array<EntityJson<EntityType.Notification>>;
  unreadCount: () => number;
}

export interface ModuleNotificationsGetters {
  getMarkReadRequestConfig: () => (
    rpc: ActionRpc<EntityType.NotificationRead, Crud.Put>,
    signature: string
  ) => ApiRequestConfig;
  getMarkReadRpc: () => () => ActionRpc<EntityType.NotificationRead, Crud.Put> | undefined;
  getNotifications: () => (creatorId: string) => Array<EntityJson<EntityType.Notification>>;
  getNotificationsPollerKey: () => (creatorId: string) => string;
  getNotificationsRequestConfig: () => (creatorId?: string) => ApiRequestConfig;
  isUnread: () => (notificationIdOrJson: string | EntityJson<EntityType.Notification>) => boolean;
}

export interface ModuleNotificationsActions {
  markRead: (this: This, creatorId: string) => Promise<void>;
  fetchNotifications: (this: This, creatorId: string) => Promise<void>;
  startPoller: (this: This, creatorId: string) => Promise<void>;
  stopPoller: (this: This, creatorId: string) => Promise<void>;
}
