import { ModuleNotificationsComputed, ThisNotifications as This } from './types';
import {
  ParsedNotificationId,
  generateNotificationReadId,
  generateUserId,
  parseId,
} from '@dispatch-services/db-forum-common/entities';

import { ModuleComputed } from '@dispatch-services/store';
import { useEntities } from '../entities';
import { useUser } from '../user';

const lastRead: ModuleComputed<This> = function () {
  if (this.computed.markingRead) {
    return this.computed.latestNotification?.blockOrder ?? '';
  }
  return this.computed.notificationRead?.lastRead ?? '';
};

const latestNotificationId: ModuleComputed<This> = function () {
  return this.computed.notifications[0]?.id ?? '';
};

const latestNotification: ModuleComputed<This> = function () {
  return useEntities.getters.getEntity(this.computed.latestNotificationId);
};

const markingRead: ModuleComputed<This> = function () {
  return this.state.markingReadId && this.computed.markingReadUserId === useUser.computed.userId;
};

const markingReadUserId: ModuleComputed<This> = function () {
  if (!this.state.markingReadId) {
    return useUser.computed.userId;
  }
  const did = (parseId(this.state.markingReadId) as ParsedNotificationId).parent.id;
  return generateUserId(did);
};

const notificationRead: ModuleComputed<This> = function () {
  if (!useUser.computed.userId) {
    return;
  }
  const notificationReadId = generateNotificationReadId(useUser.computed.userId);
  return useEntities.getters.getEntity(notificationReadId);
};

const notifications: ModuleComputed<This> = function () {
  if (!useUser.computed.userId) {
    return [];
  }
  return this.getters.getNotifications(useUser.computed.userId);
};

const unreadCount: ModuleComputed<This> = function () {
  if (this.computed.markingRead) {
    return 0;
  }
  return this.computed.unreadNotifications.length;
};

const unreadNotifications: ModuleComputed<This> = function () {
  return this.computed.notifications.filter((i) => this.getters.isUnread(i));
};

export const computed: ModuleNotificationsComputed = {
  lastRead,
  latestNotification,
  latestNotificationId,
  markingRead,
  markingReadUserId,
  notificationRead,
  notifications,
  unreadCount,
  unreadNotifications,
};
