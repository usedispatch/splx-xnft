import { BaseJson, CountJson, CountJsonParams, FullPostboxJson, PostboxJson } from './actions';
import { ChainId, chainIds } from './chains';
import { EntityType, isPostboxEntity } from './entities/types';
import { generateCountId, generateCountUserId, getParentIdFromId, getTypeFromId } from './entities/ids';

export function isCountableId(id: string) {
  const type = getTypeFromId(id);
  return type === EntityType.Admin || isPostboxEntity(type) || type === EntityType.User;
}

export function getCountIdFromId(id: string, chainId: ChainId) {
  const parentId = getTypeFromId(id) === EntityType.Vote ? getParentIdFromId(id) : id;
  if (!isCountableId(parentId)) {
    return '';
  }
  const parentIsUser = getTypeFromId(parentId) === EntityType.User;
  return parentIsUser ? generateCountUserId(parentId, chainId) : generateCountId(parentId, chainId);
}

export function getCountIdsFromId(id: string) {
  return chainIds.reduce<string[]>((acc, chainId) => {
    const countId = getCountIdFromId(id, chainId);
    if (countId) {
      acc.push(countId);
    }
    return acc;
  }, []);
}

interface CountMap {
  [parentId: string]: CountJsonParams;
}

function mergeCountJson(countJson: CountJson[]): CountMap {
  return countJson.reduce<CountMap>((acc, json) => {
    if (!acc[json.parentId]) {
      acc[json.parentId] = {} as any;
    }
    Object.entries(json).forEach(([key, value]) => {
      if (typeof value === 'number') {
        acc[json.parentId][key] = ((acc[json.parentId][key] ?? 0) as number) + value;
      }
    });
    return acc;
  }, {});
}

export function mergePostboxAndCountsJson<P extends PostboxJson>(
  postboxJson: P[],
  countJson: CountJson[]
): FullPostboxJson[] {
  const counts = mergeCountJson(countJson);
  return postboxJson.map((i) => {
    return { ...i, ...(counts[i.id] ?? {}) };
  }) as FullPostboxJson[];
}

export function topUsersByEntityCount(entities: BaseJson[], entityType: EntityType) {
  const counts = entities.reduce<{ [id: string]: number }>((acc, entity) => {
    if (getTypeFromId(entity.id) === entityType) {
      if (!acc[entity.creatorId]) {
        acc[entity.creatorId] = 1;
      } else {
        acc[entity.creatorId]++;
      }
    }
    return acc;
  }, {});
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  // return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
