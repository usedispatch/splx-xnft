import { EntityType, getTypeFromId } from '@dispatch-services/db-forum-common/entities';
import { ModuleForumsComputed, ThisForums as This } from './types';

import { ForumJson } from '@dispatch-services/db-forum-common/actions';
import { ModuleComputed } from '@dispatch-services/store';
import { useApi } from '../api';
import { useUser } from '../user';

const newestForums: ModuleComputed<This> = function () {
  const newestRequest = this.getters.getNewestForumsConfig();
  let entities = useApi.getters.getResponse(newestRequest);
  if (!entities.length && useUser.computed.userId && this.getters.getNewestForumsIsBusy()) {
    entities = useApi.getters.getResponse(this.getters.getNewestForumsConfig(true));
  }
  const forums = entities.filter((entity) => {
    return getTypeFromId(entity.id) === EntityType.Forum;
  }) as ForumJson[];
  return forums;
};

export const computed: ModuleForumsComputed = {
  newestForums,
};
