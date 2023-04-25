import { EntityJson, EntityType, PostboxEntityType, isPostboxEntity } from './types';
import {
  generateInteractionId,
  generateProfileId,
  generateUserSettingsId,
  generateWalletProxyId,
  getParentIdFromId,
  getTypeFromId,
  parseId,
} from './ids';

import { chainIds } from '../chains';
import { getCountIdsFromId } from '@dispatch-services/db-forum-common/counts';

function getCreatorIds<E extends EntityType>(entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>) {
  const ids = (Array.isArray(entityInput) ? entityInput : [entityInput]).reduce<{ [id: string]: number }>(
    (acc, entity) => {
      if (entity) {
        const id = typeof entity === 'string' ? entity : entity.creatorId;
        // creatorIds deleted for all deleted postboxes
        if (id && !acc[id]) {
          acc[id] = 0;
        }
        if (id) {
          acc[id]++;
        }
      }
      return acc;
    },
    {}
  );
  return Object.keys(ids);
}

export function getCountIds<E extends EntityType>(entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>) {
  const ids = (Array.isArray(entityInput) ? entityInput : [entityInput]).reduce<{ [id: string]: number }>(
    (acc, entity) => {
      if (entity) {
        const id = typeof entity === 'string' ? entity : entity.id;
        getCountIdsFromId(id).reduce((acc, countId) => {
          if (!acc[countId]) {
            acc[countId] = 0;
          }
          acc[countId]++;
          return acc;
        }, acc);
      }
      return acc;
    },
    {}
  );
  return Object.keys(ids);
}

export function getPostboxAncestorIds<E extends EntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>
) {
  // Create a map of ids already gotten for the entities
  const ids = (Array.isArray(entityInput) ? entityInput : [entityInput]).reduce<{ [id: string]: number }>(
    (acc, entity) => {
      if (entity) {
        const id = typeof entity === 'string' ? entity : entity.id;
        const type = getTypeFromId(id);
        if (isPostboxEntity(type)) {
          if (!acc[id]) {
            acc[id] = 0;
          }
          acc[id]++;
        }
      }
      return acc;
    },
    {}
  );
  return Object.keys(ids).reduce<string[]>((acc, id) => {
    const parsedId = parseId(id);
    return (Array.isArray(parsedId) ? parsedId : []).reduce((acc, { id }) => {
      if (!ids[id]) {
        ids[id] = 0;
        acc.push(id);
      }
      ids[id]++;
      return acc;
    }, acc);
  }, []);
}

export function getPostboxPinnedIds<E extends PostboxEntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>
) {
  const pins = (Array.isArray(entityInput) ? entityInput : [entityInput]).reduce<{ [pinId: string]: number }>(
    (acc, entity) => {
      const pins = typeof entity === 'string' ? [] : entity.pins;
      return pins.reduce((acc, pinId) => {
        if (!acc[pinId]) {
          acc[pinId] = 0;
        }
        acc[pinId]++;
        return acc;
      }, acc);
    },
    {}
  );
  return Object.keys(pins);
}

export function getRelatedPostboxIds<E extends EntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>
) {
  const entities = Array.isArray(entityInput) ? entityInput : [entityInput];
  const ancestorIds = getPostboxAncestorIds(entityInput);
  const entitiesAndAncestorIds = [...entities, ...ancestorIds];
  const creatorIds = getRelatedCreatorIds(entitiesAndAncestorIds);
  const countIds = getCountIds(entitiesAndAncestorIds);
  return [...creatorIds, ...countIds, ...ancestorIds];
}

export function getInteractionIds<E extends EntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>,
  currentUserId: string
) {
  const ids = (Array.isArray(entityInput) ? entityInput : [entityInput]).reduce<{ [id: string]: number }>(
    (acc, entity) => {
      if (entity) {
        let id = typeof entity === 'string' ? entity : entity.id;
        if (getTypeFromId(id) === EntityType.Vote) {
          id = getParentIdFromId(id);
        }
        if (!acc[id]) {
          acc[id] = 0;
        }
        acc[id]++;
      }

      return acc;
    },
    {}
  );
  return Object.keys(ids).reduce<string[]>((acc, id) => {
    const parsedId = parseId(id);
    return (Array.isArray(parsedId) ? parsedId : []).reduce((acc, { id }) => {
      if (ids[id]) {
        ids[id] = 0;
        acc.push(generateInteractionId(currentUserId, id));
      }
      ids[id]++;
      return acc;
    }, acc);
  }, []);
}

export function getInteractionAncestorIds<E extends EntityType>(entityInput: EntityJson<E> | Array<EntityJson<E>>) {
  // TODO:Partyman For now only check vote interactions, but later figure out a better way of doing it.
  const interactions = (Array.isArray(entityInput) ? entityInput : [entityInput]).filter(
    (i) => i && getTypeFromId(i.id) === EntityType.InteractionVote
  ) as Array<EntityJson<EntityType.InteractionVote>>;
  const ids = interactions.reduce<{ [id: string]: number }>((acc, entity) => {
    const parentId = entity.parentId;
    const entityId = entity.entityId;
    if (parentId) {
      if (!acc[parentId]) {
        acc[parentId] = 0;
      }
      acc[parentId]++;
    }
    if (entityId) {
      if (!acc[entityId]) {
        acc[entityId] = 0;
      }
      acc[entityId]++;
    }
    return acc;
  }, {});
  return Object.keys(ids);
}

export function getRelatedCurrentUserIds<E extends EntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>,
  currentUserId: string
) {
  return [
    currentUserId,
    generateProfileId(currentUserId),
    generateUserSettingsId(currentUserId),
    ...getInteractionIds(entityInput, currentUserId),
    ...chainIds.map((chainId) => generateWalletProxyId(chainId, currentUserId)),
  ];
}

export function getRelatedCreatorIds<E extends EntityType>(
  entityInput: EntityJson<E> | string | Array<EntityJson<E> | string>
) {
  const entities = Array.isArray(entityInput) ? entityInput : [entityInput];
  const creatorIds = getCreatorIds(entities);
  const creatorCountIds = getCountIds(creatorIds);
  const profileIds = creatorIds.map((id) => generateProfileId(id));
  return [...creatorIds, ...creatorCountIds, ...profileIds];
}
