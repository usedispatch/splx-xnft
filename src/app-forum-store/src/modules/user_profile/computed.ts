import {
  EntityJson,
  EntityType,
  generateProfileId,
  generateUserSettingsId,
} from '@dispatch-services/db-forum-common/entities';
import { ModuleUserProfileComputed, ThisUserProfile as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';
import { UserSettingsJson } from '@dispatch-services/db-forum-common/actions';
import { useEntities } from '../entities';
import { useUser } from '../user';

const profileId: ModuleComputed<This> = function (): string {
  if (!useUser.computed.userId) {
    return '';
  }
  return generateProfileId(useUser.computed.userId);
};

const profile: ModuleComputed<This> = function (): EntityJson<EntityType.Profile> | undefined {
  if (!this.computed.profileId) {
    return;
  }
  return useEntities.getters.getEntity(this.computed.profileId) as EntityJson<EntityType.Profile> | undefined;
};

const userSettings: ModuleComputed<This> = function (): UserSettingsJson | undefined {
  if (!this.computed.userSettingsId) {
    return;
  }
  return useEntities.getters.getEntity(this.computed.userSettingsId) as UserSettingsJson | undefined;
};

const userSettingsId: ModuleComputed<This> = function (): string {
  const userId = useUser.computed.userId;
  if (!userId) {
    return '';
  }
  return generateUserSettingsId(userId);
};

const preferWalletPopups: ModuleComputed<This> = function (): boolean {
  const userSettings = this.computed.userSettings;
  return userSettings ? userSettings.preferWalletPopups : false;
};

export const computed: ModuleUserProfileComputed = {
  preferWalletPopups,
  profile,
  profileId,
  userSettings,
  userSettingsId,
};
