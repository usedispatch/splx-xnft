import { ActionCreateInput, Crud } from '@dispatch-services/db-forum-common/actions';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';
import { ModuleVotesActions, ThisVotes as This } from './types';

import { ModuleAction } from '@dispatch-services/store';
import { useActions } from '../actions';

const createVote: ModuleAction<This> = async (value: 1 | -1, postboxEntityId: string) => {
  const voteBody: ActionCreateInput<EntityType.Vote, Crud.Post> = {
    crud: Crud.Post,
    type: EntityType.Vote,
    parentId: postboxEntityId,
    params: { value },
  };
  await useActions.actions.post(voteBody);
};

const editVote: ModuleAction<This> = async (value: 1 | -1, voteEntityId: string) => {
  const voteBody: ActionCreateInput<EntityType.Vote, Crud.Put> = {
    crud: Crud.Put,
    type: EntityType.Vote,
    crudEntityId: voteEntityId,
    params: { value },
  };
  await useActions.actions.post(voteBody);
};

const createOrEditVote: ModuleAction<This> = async function (this: This, value: 1 | -1, postboxEntityId: string) {
  const hasVoted = !!this.getters.getUserVoteForPostbox(postboxEntityId);
  if (hasVoted) {
    const voteEntity = this.getters.getVoteInteractionForPostbox(
      postboxEntityId
    ) as EntityJson<EntityType.InteractionVote>;
    await this.actions.editVote(value, voteEntity.entityId);
    return;
  }
  await this.actions.createVote(value, postboxEntityId);
};

export const actions: ModuleVotesActions = {
  createOrEditVote,
  createVote,
  editVote,
};
