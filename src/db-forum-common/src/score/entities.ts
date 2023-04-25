import { EntityJson, EntityType, generateProfileId } from '../entities';

import { EntitiesMap } from '../pending/types';

function getJson<T extends EntityType>(entity: any): EntityJson<T> | undefined {
  if (!entity) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(entity, 'model')) {
    return entity.model?.json;
  }
  return entity;
}

export function getEntityJson<T extends EntityType>(id: string, entities: EntitiesMap) {
  const entity = entities[id] as any;
  return getJson<T>(entity);
}

export function isVerifiedUser(userId: string, entities: EntitiesMap) {
  // For now just twitter.
  const profileId = generateProfileId(userId);
  const profile = getEntityJson<EntityType.Profile>(profileId, entities);
  return !!profile?.twitter;
}
