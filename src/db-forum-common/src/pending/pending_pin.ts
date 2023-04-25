import {
  ActionCreate,
  PinActionParams,
  PostboxActionParams,
  PostboxJson,
  ProfileActionParams,
  getDefaultActionParams,
} from '../actions';
import { ActionEntityJson, Crud } from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EditMapValue, EntitiesMap } from './types';
import { EntityJson, EntityType, isPostboxEntity } from '@dispatch-services/db-forum-common/entities/types';
import { getParentIdFromId, getPostboxPinId, normalizeId } from '@dispatch-services/db-forum-common/entities/ids';

import { getBasePendingFromAction } from './pending_base';
import { mergeJson } from '@dispatch-services/utils-common/json';

function shouldMutatePin(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return isPostboxEntity(action.type) && Object.prototype.hasOwnProperty.call(action.params ?? {}, 'pin');
}

function createPendingPinFromAction(actionJson: ActionEntityJson, blockOrder: string): EntityJson<EntityType.Pin> {
  const { action } = actionJson;
  const { crudEntityId } = action as ActionCreate<EntityType.Post, Crud.Put | Crud.Delete>;
  const pinId = getPostboxPinId(crudEntityId);
  const base = getBasePendingFromAction(actionJson, pinId, blockOrder);
  const params = getDefaultActionParams(EntityType.Pin, crudEntityId) as Required<PinActionParams>;
  return {
    ...base,
    ...params,
    ...(actionJson.action.crud === Crud.Post && actionJson.action.type === EntityType.Profile
      ? actionJson.action.params
      : {}),
  };
}

export function mutatePendingPinFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutatePin(actionJson)) {
    return;
  }
  const pinId = getPostboxPinId(actionJson.action.crudEntityId ?? '');
  if (!entities[pinId]) {
    entities[pinId] = createPendingPinFromAction(actionJson, blockOrder);
  }
  if (actionJson.action.crud === Crud.Put && (actionJson.action.params as PostboxActionParams).pin === false) {
    const params = actionJson.action.params as ProfileActionParams;
    edits[normalizeId(pinId)] = { params, crud: Crud.Delete };
  }

  if (actionJson.action.crudEntityId && (actionJson.action.params as PostboxActionParams).pin === true) {
    const params = actionJson.action.params as ProfileActionParams;
    edits[normalizeId(pinId)] = { params, crud: Crud.Post };

    // handle other edits too
    const editId = normalizeId(getParentIdFromId(actionJson.action.crudEntityId));
    edits[editId] = mergeJson(
      edits[editId] ?? {
        params: {},
        crud: Crud.Put,
      },
      {
        properties: { pins: [] },
        crud: actionJson.action.crud,
      }
    ) as EditMapValue;
    if ((edits[editId]?.properties as PostboxJson)?.pins) {
      (edits[editId]?.properties as PostboxJson).pins = [actionJson.action.crudEntityId];
    }
  }
}
