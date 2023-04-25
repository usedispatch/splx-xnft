import {
  ActionCreate,
  ActionEntityJson,
  Crud,
  PostboxActionParams,
} from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EditMapValue, EntitiesMap } from './types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';

import { getBasePendingFromAction } from './pending_base';
import { getDepthFromId } from '../depth_order';
import { getIdFromAction } from '@dispatch-services/db-forum-common/actions/ids';
import { mergeJson } from '@dispatch-services/utils-common/json';
import { normalizeId } from '../entities';
import { parseBlockOrder } from '../block_order';

function shouldMutatePostbox(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return (
    action.type === EntityType.Forum ||
    action.type === EntityType.Topic ||
    action.type === EntityType.Post ||
    action.type === EntityType.ProductTopic
  );
}

function getActionParamsFromAction(actionJson: ActionEntityJson): Required<PostboxActionParams> {
  const action = actionJson.action;
  const { params } = action as ActionCreate<
    EntityType.Forum | EntityType.Topic | EntityType.Post | EntityType.ProductTopic,
    typeof actionJson.action.crud
  >;
  return {
    title: params?.title ?? '',
    body: params?.body ?? '',
    image: params?.image ?? '',
    pin: params?.pin ?? false,
    url: params?.url ?? '',
    subtitle: params?.subtitle ?? '',
    mentions: params?.mentions ?? [],
    tags: params?.tags ?? [],
    media: params?.media ?? [],
    programId: params?.programId ?? '',
  };
}

export function createPendingPostboxFromAction(
  actionJson: ActionEntityJson,
  postboxId: string,
  blockOrder: string
): EntityJson<EntityType.Forum | EntityType.Topic | EntityType.Post | EntityType.ProductTopic> {
  const base = getBasePendingFromAction(actionJson, postboxId, blockOrder);
  const params = getActionParamsFromAction(actionJson);
  const { block, timestamp, txn } = parseBlockOrder(blockOrder);
  const depth = getDepthFromId(postboxId);

  return {
    ...base,
    ...params,
    block,
    depth,
    pins: [], // TODO(Partyman): fix later
    time: timestamp,
    txn,
    updateTime: 0,
  };
}

export function mutatePendingPostboxFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutatePostbox(actionJson)) {
    return;
  }
  // const params = getActionParamsFromAction(actionJson);
  const postboxId = getIdFromAction(actionJson);
  if (!entities[postboxId]) {
    entities[postboxId] = createPendingPostboxFromAction(actionJson, postboxId, blockOrder);
  }
  if (actionJson.action.crud !== Crud.Post) {
    // Note(Partyman): In the case of deletes, params will not exist, so we don't want things to barf down the line.
    edits[normalizeId(postboxId)] = mergeJson(
      edits[normalizeId(postboxId)] ?? {
        params: {},
        crud: Crud.Put,
      },
      {
        params: actionJson.action.params ?? {},
        crud: actionJson.action.crud,
      }
    ) as EditMapValue;
  }
}
