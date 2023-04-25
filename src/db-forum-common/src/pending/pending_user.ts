import { ActionEntityJson, Crud, UserActionParams } from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType, isPostboxEntity } from '@dispatch-services/db-forum-common/entities/types';
import { ParsedUserId, parseId } from '@dispatch-services/db-forum-common/entities/ids';

import { getBasePendingFromAction } from './pending_base';

function shouldMutateUser(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return action.type === EntityType.User || (isPostboxEntity(action.type) && action.crud === Crud.Post);
}

function getActionParamsFromAction(actionJson: ActionEntityJson): Required<UserActionParams> {
  const { creatorId } = actionJson;
  const parsedId = parseId(creatorId) as ParsedUserId;
  // Then it's a forum.
  return {
    did: parsedId.id,
  };
}

function createPendingUserFromAction(
  actionJson: ActionEntityJson,
  userId: string,
  blockOrder: string
): EntityJson<EntityType.User> {
  const base = getBasePendingFromAction(actionJson, userId, blockOrder);
  const params = getActionParamsFromAction(actionJson);
  return {
    ...base,
    ...params,
  };
}

export function mutatePendingUserFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateUser(actionJson)) {
    return;
  }
  const params = getActionParamsFromAction(actionJson);
  const userId = actionJson.creatorId;
  if (!entities[userId]) {
    entities[userId] = createPendingUserFromAction(actionJson, userId, blockOrder);
  }
  if (actionJson.action.crud === Crud.Delete) {
    edits[userId] = { params, crud: actionJson.action.crud };
  }
}
