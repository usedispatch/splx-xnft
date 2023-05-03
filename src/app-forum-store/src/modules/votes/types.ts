import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities';

import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisVotes = ModuleApi<ModuleVotesState, ModuleVotesComputed, ModuleVotesGetters, ModuleVotesActions>;
type This = ThisVotes;

export interface ModuleVotesState {
  example: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleVotesComputed {}

export interface ModuleVotesGetters {
  getUserVoteForPostbox: () => (entityId: string) => number;
  getVoteInteractionForPostbox: () => (postboxEntityId: string) => EntityJson<EntityType.InteractionVote> | undefined;
  userDownvoted: () => (id: string) => boolean;
  userUpvoted: () => (id: string) => boolean;
}

export interface ModuleVotesActions {
  createOrEditVote: (this: This, value: 1 | -1, postboxEntityId: string) => Promise<void>;
  createVote: (this: This, value: 1 | -1, postboxEntityId: string) => Promise<void>;
  editVote: (this: This, value: 1 | -1, voteEntityId: string) => Promise<void>;
}
