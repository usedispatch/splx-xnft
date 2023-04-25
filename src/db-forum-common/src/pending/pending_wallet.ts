import { ActionEntityJson, Crud, WalletActionParams } from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType, isPostboxEntity } from '@dispatch-services/db-forum-common/entities/types';

import { generateWalletId } from '@dispatch-services/db-forum-common/entities/ids';
import { getBasePendingFromAction } from './pending_base';
import { getDefaultActionParams } from '../actions';

function shouldMutateWallet(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  return isPostboxEntity(action.type) && action.crud === Crud.Post;
}

function getActionParamsFromAction(actionJson: ActionEntityJson): Required<WalletActionParams> {
  const { creatorId, chainId, wallet } = actionJson;
  const params = getDefaultActionParams(EntityType.Wallet, creatorId) as Required<WalletActionParams>;
  return {
    ...params,
    address: wallet,
    chainId,
  };
}

function createPendingWalletFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string
): EntityJson<EntityType.Wallet> {
  const { creatorId } = actionJson;
  const base = getBasePendingFromAction(actionJson, creatorId, blockOrder);
  const params = getActionParamsFromAction(actionJson);
  return {
    ...base,
    ...params,
  };
}

export function mutatePendingWalletFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  if (!shouldMutateWallet(actionJson)) {
    return;
  }
  const params = getActionParamsFromAction(actionJson);
  const walletId = generateWalletId(params.address, params.parentId);
  if (!entities[walletId]) {
    entities[walletId] = createPendingWalletFromAction(actionJson, blockOrder);
  }
  if (actionJson.action.crud === Crud.Delete) {
    edits[walletId] = { params, crud: actionJson.action.crud };
  }
}
