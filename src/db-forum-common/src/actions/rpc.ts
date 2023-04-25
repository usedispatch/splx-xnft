import { ActionCreateInput, ActionRpc, Crud, LocalMetadata } from './types';

import { ChainId } from '../chains';
import { EntityType } from '@dispatch-services/db-forum-common/entities';
import { SHA256 } from '@dispatch-services/utils-common/string';
import { createAction } from './create';

export function createActionRpc<E extends EntityType, C extends Crud>(
  creatorId: string,
  wallet: string,
  chainId: ChainId,
  type: EntityType,
  crud: Crud,
  params: ActionCreateInput<E, C>,
  meta?: LocalMetadata
): ActionRpc<E, C> {
  const action = createAction<typeof type, typeof crud>(type, crud, params);
  const hash = SHA256(JSON.stringify(action));
  const rpc: ActionRpc<typeof type, typeof crud> = {
    creatorId,
    wallet,
    chainId,
    action,
    hash,
  };
  if (meta) rpc.meta = meta;
  return rpc;
}
