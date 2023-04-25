import { ActionEntityJson, AdminActionParams, Crud } from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';
import { generateAdminId, normalizeId } from '@dispatch-services/db-forum-common/entities/ids';

import { getBasePendingFromAction } from './pending_base';
import { getIdFromAction } from '@dispatch-services/db-forum-common/actions/ids';

function shouldMutateAdmin(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return action.type === EntityType.Admin || (action.type === EntityType.Forum && action.crud === Crud.Post);
}

function getActionParamsFromAction(actionJson: ActionEntityJson): AdminActionParams {
  const { action, creatorId } = actionJson;
  if (action.type === EntityType.Admin) {
    return action.params as AdminActionParams;
  }
  // Then it's a forum.
  return {
    entityId: creatorId,
    parentId: getIdFromAction(actionJson),
  };
}

function createPendingAdminFromAction(
  actionJson: ActionEntityJson,
  adminId: string,
  blockOrder: string
): EntityJson<EntityType.Admin> {
  const base = getBasePendingFromAction(actionJson, adminId, blockOrder);
  const params = getActionParamsFromAction(actionJson);
  return {
    ...base,
    ...params,
  };
}

export function mutatePendingAdminFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateAdmin(actionJson)) {
    return;
  }
  const params = getActionParamsFromAction(actionJson);
  const adminId = generateAdminId(params.entityId, params.parentId);
  if (!entities[adminId]) {
    entities[adminId] = createPendingAdminFromAction(actionJson, adminId, blockOrder);
  }
  if (actionJson.action.crud === Crud.Delete) {
    edits[normalizeId(adminId)] = { params, crud: actionJson.action.crud };
  }
}
