import { ModuleVotesGetters, ThisVotes as This } from './types';
import { generateInteractionId, normalizeId } from '@dispatch-services/db-forum-common/entities';

import { ModuleGetter } from '@dispatch-services/store/index';
import { VoteActionParams } from '@dispatch-services/db-forum-common/actions';
import { useEntities } from '../entities';
import { useLocalState } from '../local_state';
import { useUser } from '../user';

const getVoteInteractionForPostbox: ModuleGetter<This> = function () {
  return (postboxEntityId: string) => {
    const id = generateInteractionId(useUser.computed.userId, postboxEntityId);
    const normalizedId = generateInteractionId(useUser.computed.userId, normalizeId(postboxEntityId));
    return useEntities.getters.getPendingEntity(normalizedId) ?? useEntities.getters.getEntity(id);
  };
};

const getUserVoteForPostbox: ModuleGetter<This> = function () {
  return (postboxEntityId: string) => {
    const normalizedId = generateInteractionId(useUser.computed.userId, normalizeId(postboxEntityId));
    // console.log('getting interaction for', id);
    const vote =
      (useLocalState.getters.getEditParams(normalizedId)?.params as VoteActionParams | undefined) ??
      this.getters.getVoteInteractionForPostbox(postboxEntityId);
    return vote?.value ?? 0;
  };
};

const userUpvoted: ModuleGetter<This> = function () {
  return (id: string) => {
    return this.getters.getUserVoteForPostbox(id) === 1;
  };
};

const userDownvoted: ModuleGetter<This> = function () {
  return (id: string) => {
    return this.getters.getUserVoteForPostbox(id) === -1;
  };
};

export const getters: ModuleVotesGetters = {
  getVoteInteractionForPostbox,
  getUserVoteForPostbox,
  userDownvoted,
  userUpvoted,
};
