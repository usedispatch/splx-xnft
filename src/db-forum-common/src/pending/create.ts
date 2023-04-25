import { ActiveMap, EditMap, EntitiesMap } from './types';

import { ActionEntityJson } from '@dispatch-services/db-forum-common/actions/types';
import { mutatePendingAdminFromAction } from './pending_admin';
import { mutatePendingCountsFromAction } from './pending_count';
import { mutatePendingInteractionVoteFromAction } from './pending_interaction_vote';
import { mutatePendingPinFromAction } from './pending_pin';
import { mutatePendingPostboxFromAction } from './pending_postbox';
import { mutatePendingProfileFromAction } from './pending_profile';
import { mutatePendingUserFromAction } from './pending_user';
import { mutatePendingVoteFromAction } from './pending_vote';
import { mutatePendingWalletFromAction } from './pending_wallet';

export function mutatePendingFromAction(
  actionJson: ActionEntityJson,
  entities: EntitiesMap,
  edits: EditMap,
  active: ActiveMap
) {
  const blockOrder = actionJson.blockOrder;
  mutatePendingAdminFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingCountsFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingInteractionVoteFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingPinFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingPostboxFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingProfileFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingUserFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingVoteFromAction(actionJson, blockOrder, entities, edits, active);
  mutatePendingWalletFromAction(actionJson, blockOrder, entities, edits, active);
}
