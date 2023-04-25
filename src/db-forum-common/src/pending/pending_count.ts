import {
  ActionEntityJson,
  CountJson,
  CountJsonParams,
  Crud,
  VoteActionParams,
} from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityType, isPostboxEntity } from '@dispatch-services/db-forum-common/entities/types';
import { generateCountId, normalizeId } from '@dispatch-services/db-forum-common/entities/ids';
import { getIdFromAction, getParentIdFromAction } from '@dispatch-services/db-forum-common/actions/ids';

import { getBasePendingFromAction } from './pending_base';
import { getCountIdFromLog } from '../actions';
import { getDefaultActionParams } from '@dispatch-services/db-forum-common/actions/create';

function shouldMutateCount(actionJson: ActionEntityJson, entities: EntitiesMap, active: ActiveMap) {
  const { action } = actionJson;
  const { type } = action;
  const rightType = type === EntityType.Admin || isPostboxEntity(type);
  const entityId = normalizeId(getIdFromAction(actionJson));
  return rightType && !active[entityId];
}

function shouldMutateParentCount(actionJson: ActionEntityJson) {
  // Get the type from the action.
  const { action } = actionJson;
  const { type, crud } = action;
  return (
    type === EntityType.Admin ||
    ((type === EntityType.Post || type === (EntityType.ProductTopic || EntityType.Topic)) && crud !== Crud.Put)
  );
}

function mergeCounts(increments: CountJsonParams, currCount?: CountJsonParams) {
  if (!currCount) {
    return increments;
  }
  return Object.keys(increments).reduce<CountJsonParams>(
    (acc, key) => {
      acc[key as keyof CountJsonParams] += increments[key as keyof CountJsonParams] ?? 0;
      return acc;
    },
    { ...currCount }
  );
}

function incrementParentCountJsonParams(actionJson: ActionEntityJson, edits: EditMap) {
  const { action } = actionJson;
  const params = getDefaultActionParams(EntityType.Count, '') as CountJsonParams;
  const increment = action.crud === Crud.Post ? 1 : action.crud === Crud.Delete ? -1 : 0;
  const countId = normalizeId(generateCountId(getParentIdFromAction(actionJson), actionJson.chainId));
  switch (action.type) {
    case EntityType.Admin:
      params.admins += increment;
      break;
    case EntityType.Post:
    case EntityType.ProductTopic:
    case EntityType.Topic:
      params.children += increment;
      break;
    default:
      return;
  }
  edits[countId] = { params: mergeCounts(params, edits[countId]?.params as CountJsonParams), crud: action.crud };
}

function incrementCountJsonParams(actionJson: ActionEntityJson, edits: EditMap) {
  const { action } = actionJson;
  const params = getDefaultActionParams(EntityType.Count, '') as CountJsonParams;
  const increment = action.crud === Crud.Post ? 1 : action.crud === Crud.Delete ? -1 : 0;
  const countId = normalizeId(getCountIdFromLog(actionJson));
  switch (action.type) {
    case EntityType.Forum:
      params.admins += increment;
      break;
    case EntityType.Vote: {
      const { value } = action.params as VoteActionParams;
      if (increment && value > 0) {
        // then it's a post or a delete and an upvote.
        params.upVotes += increment;
      } else if (increment && value < 0) {
        // Then it's a post or a delete and a downvote.
        params.downVotes += increment;
      } else {
        // Then it's an edit so we need to edit both upVotes and downVotes.
        params.upVotes += value > 0 ? 1 : -1;
        params.downVotes += value > 0 ? -1 : 1;
      }
      break;
    }
    default:
      return;
  }

  edits[countId] = { params: mergeCounts(params, edits[countId]?.params as CountJsonParams), crud: action.crud };
}

function createPendingCountFromAction(
  actionJson: ActionEntityJson,
  countId: string,
  blockOrder: string,
  entities: EntitiesMap
) {
  const base = getBasePendingFromAction(actionJson, countId, blockOrder);
  const params = getDefaultActionParams(EntityType.Count, '') as CountJsonParams;
  const countJson: CountJson = {
    ...base,
    ...params,
  };
  entities[countId] = countJson;
}

export function mutatePendingCountsFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateCount(actionJson, entities, active)) {
    return;
  }
  const isVote = actionJson.action.type === EntityType.Vote;
  let parentCountId: string = '';
  if (shouldMutateParentCount(actionJson) || isVote) {
    const parentId = getParentIdFromAction(actionJson);
    parentCountId = generateCountId(parentId, actionJson.chainId);
    !entities[parentCountId] && createPendingCountFromAction(actionJson, parentCountId, blockOrder, entities);
    isVote ? incrementCountJsonParams(actionJson, edits) : incrementParentCountJsonParams(actionJson, edits);
  }
  let countId: string = '';
  if (!isVote) {
    countId = generateCountId(getIdFromAction(actionJson), actionJson.chainId);
    !entities[countId] && createPendingCountFromAction(actionJson, countId, blockOrder, entities);
    incrementCountJsonParams(actionJson, edits);
  }
}
