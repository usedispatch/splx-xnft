import { BaseJson, TopicJson } from './actions/types';
import { ModelStatus, PostboxEntityJson } from './entities/types';

import { optimisticIdTimeReg } from './entities';

function getIdFromEntity<E extends PostboxEntityJson>(e: E) {
  const id = e._localId ?? e.id;
  return e.status === ModelStatus.Pending || e._localId ? id.replace(optimisticIdTimeReg, '') : id;
}

export function byKey<E extends PostboxEntityJson>(a: E, b: E) {
  if (!a || !b) {
    return -1;
  }
  return getIdFromEntity(a).localeCompare(getIdFromEntity(b));
}

export function byBlockOrder<E extends BaseJson>(a: E, b: E) {
  if (!a || !b) {
    return -1;
  }
  return a.blockOrder.localeCompare(b.blockOrder);
}

function groupByDepthAndKey(sortedByKey: PostboxEntityJson[]) {
  const grouped: PostboxEntityJson[][][] = [];
  let currGroup: PostboxEntityJson[][] = [[]];
  let currSubGroup: PostboxEntityJson[] = [];
  let currDepth = Infinity;
  for (let i = 0; i < sortedByKey.length; i++) {
    const entity = sortedByKey[i];
    if (entity.depth < currDepth) {
      currGroup = [];
      grouped.push(currGroup);
    }
    if (entity.depth !== currDepth) {
      currSubGroup = [];
      currDepth = entity.depth;
      currGroup.push(currSubGroup);
    }
    currSubGroup.push(entity);
  }
  return grouped;
}

function dedupeEntities(entities: PostboxEntityJson[]) {
  const map = entities.reduce<{ [id: string]: PostboxEntityJson }>((acc, entity) => {
    const id = entity._localId ?? entity.id;
    if (!acc[id]) {
      acc[id] = entity;
    }
    return acc;
  }, {});
  return Object.values(map);
}

export function sortByDepthAndTime(entities: PostboxEntityJson[], sortOrder = 'asc') {
  const sortedByKey = dedupeEntities(entities).sort(byKey);
  // use reverse if sortOrder === 'desc';
  if (sortOrder === 'asc' || !sortedByKey.length) {
    return sortedByKey;
  }
  const groups = groupByDepthAndKey(sortedByKey);
  const orderedArrays: PostboxEntityJson[][] = [];
  for (let i = 0; i < groups.length; i++) {
    // Sort each sub group.
    for (let j = 0; j < groups[i].length; j++) {
      // Can pre sort it by score or upvote or whatever.
      groups[i][j].reverse();
    }
    const head = groups[i].shift() as PostboxEntityJson[];
    const tail = groups[i].flat();
    const parent = head.shift() as PostboxEntityJson;
    orderedArrays.push([parent, ...tail, ...head]);
  }
  return orderedArrays.reverse().flat();
}

export function sortTopicsByVotes(topics: Array<TopicJson & { currentVotes: number }>) {
  return topics.sort((a, b) => b.currentVotes - a.currentVotes);
}
