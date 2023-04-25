import { ActionEntityJson, Crud } from '@dispatch-services/db-forum-common/actions/types';
import { ActiveMap, EditMap, EntitiesMap } from './types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';
import { ProfileActionParams, getDefaultActionParams } from '../actions';

import { generateProfileId } from '@dispatch-services/db-forum-common/entities/ids';
import { getBasePendingFromAction } from './pending_base';
import { getInitialFunding } from '../proxy_wallet';

function createPendingProfileFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string
): EntityJson<EntityType.Profile> {
  const { creatorId, chainId } = actionJson;
  const base = getBasePendingFromAction(actionJson, generateProfileId(creatorId), blockOrder);
  const params = getDefaultActionParams(EntityType.Profile, creatorId) as Required<ProfileActionParams>;
  return {
    ...base,
    ...params,
    ...(actionJson.action.crud === Crud.Post && actionJson.action.type === EntityType.Profile
      ? actionJson.action.params
      : {}),
    funds: { [chainId]: getInitialFunding(chainId) }, // Change to get funds later.
    proxyKeys: {},
  };
}

export function mutatePendingProfileFromAction(
  actionJson: ActionEntityJson,
  blockOrder: string,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  const profileId = generateProfileId(actionJson.creatorId);
  if (!entities[profileId]) {
    entities[profileId] = createPendingProfileFromAction(actionJson, blockOrder);
  }
  if (actionJson.action.crud === Crud.Put && actionJson.action.type === EntityType.Profile) {
    const params = actionJson.action.params as ProfileActionParams;
    if (params.disconnect) {
      params.image = '';
      params.twitter = '';
    }
    edits[profileId] = { params, crud: actionJson.action.crud };
  }
}
