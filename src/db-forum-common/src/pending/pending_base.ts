import { ActionEntityJson, BaseJson, Crud } from '@dispatch-services/db-forum-common/actions/types';

import { ModelStatus } from '@dispatch-services/db-forum-common/entities/types';

export function getBasePendingFromAction(actionJson: ActionEntityJson, id: string, blockOrder: string): BaseJson {
  const { actionId, chainId, creatorId, action, wallet, pendingId } = actionJson;
  const { parentId, params } = action;
  return {
    actionId,
    blockOrder,
    chainId,
    creatorId,
    id,
    parentId: parentId ?? '',
    pendingActionId: pendingId,
    status: ModelStatus.Pending,
    tags: (params as any)?.tags ?? [],
    txId: '',
    updatedBlockOrder: action.crud === Crud.Post ? '' : blockOrder,
    wallet,
    deletedBy: '',
  };
}
