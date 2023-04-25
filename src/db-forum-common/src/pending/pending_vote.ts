import {
  ActionCreate,
  ActionEntityJson,
  Crud,
  VoteActionParams,
} from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';

import { getBasePendingFromAction } from './pending_base';
import { getDepthFromId } from '../depth_order';
import { getIdFromAction } from '@dispatch-services/db-forum-common/actions/ids';
import { normalizeId } from '../entities';
import { parseBlockOrder } from '../block_order';

function shouldMutateVote(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return action.type === EntityType.Vote;
}

function getActionParamsFromAction(actionJson: ActionEntityJson): Required<VoteActionParams> {
  const { action } = actionJson;
  const { params } = action as ActionCreate<EntityType.Vote, typeof actionJson.action.crud>;
  return {
    value: params.value ?? 0,
  };
}

function createPendingPostboxFromAction(
  actionJson: ActionEntityJson,
  postboxId: string,
  blockOrder: string
): EntityJson<EntityType.Vote> {
  const base = getBasePendingFromAction(actionJson, postboxId, blockOrder);
  const params = getActionParamsFromAction(actionJson);
  const { block, timestamp, txn } = parseBlockOrder(blockOrder);
  const depth = getDepthFromId(postboxId);

  return {
    ...base,
    ...params,
    block,
    depth,
    image: '',
    mentions: [],
    pin: false,
    pins: [],
    subtitle: '',
    tags: [],
    time: timestamp,
    txn,
    title: '',
    body: '',
    updateTime: 0,
    url: '',
    media: [],
    programId: '',
  };
}

export function mutatePendingVoteFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateVote(actionJson)) {
    return;
  }
  const params = getActionParamsFromAction(actionJson);
  const postboxId = getIdFromAction(actionJson);
  if (!entities[postboxId]) {
    entities[postboxId] = createPendingPostboxFromAction(actionJson, postboxId, blockOrder);
  }
  if (actionJson.action.crud !== Crud.Post) {
    edits[normalizeId(postboxId)] = { params, crud: actionJson.action.crud };
  }
}
