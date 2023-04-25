import {
  ActionCreate,
  ActionEntityJson,
  Crud,
  VoteActionParams,
} from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';
import { generateInteractionId, getParentIdFromId, normalizeId } from '@dispatch-services/db-forum-common/entities/ids';

import { getBasePendingFromAction } from './pending_base';
import { getIdFromAction } from '@dispatch-services/db-forum-common/actions/ids';

function shouldMutateInteractionVote(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return action.type === EntityType.Vote;
}

function getInteractionParams(actionJson: ActionEntityJson): VoteActionParams {
  const { params } = actionJson.action as ActionCreate<EntityType.Vote, typeof actionJson.action.crud>;
  return {
    value: params.value ?? 0,
  };
}

function createPendingInteractionVoteFromAction(
  actionJson: ActionEntityJson,
  interactionId: string,
  blockOrder: string
): EntityJson<EntityType.InteractionVote> {
  const base = getBasePendingFromAction(actionJson, interactionId, blockOrder);
  const params = getInteractionParams(actionJson);
  return {
    entityId: getIdFromAction(actionJson),
    ...base,
    ...params,
  };
}

export function mutatePendingInteractionVoteFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateInteractionVote(actionJson)) {
    return;
  }
  const { creatorId } = actionJson;
  const voteId = getIdFromAction(actionJson);
  const interactionId = generateInteractionId(creatorId, getParentIdFromId(voteId));
  if (!entities[interactionId]) {
    entities[interactionId] = createPendingInteractionVoteFromAction(actionJson, interactionId, blockOrder);
  }
  const { action } = actionJson;
  const { crud } = action;
  if (crud !== Crud.Post) {
    const params = getInteractionParams(actionJson);
    edits[normalizeId(interactionId)] = { params, crud };
  }
}
