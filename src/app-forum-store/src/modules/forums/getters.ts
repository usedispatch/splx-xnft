import { ActionCreateInput, Crud, ForumJson } from '@dispatch-services/db-forum-common/actions';
import { ApiRequestConfig, useApi } from '@dispatch-services/app-forum-store/modules/api';
import { EntityType, getActionIdFromOptimisticActionId } from '@dispatch-services/db-forum-common/entities';
import { ModuleForumsGetters, ThisForums as This } from './types';

import { ModuleGetter } from '@dispatch-services/store';
import { useActions } from '../actions';
import { useEntities } from '../entities';
import { useLocalState } from '../local_state';
import { useUser } from '../user';

const getNewestForumsConfig: ModuleGetter<This> = function () {
  return (ignoreCreatorId: boolean = false): ApiRequestConfig => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/forums',
    };
    const creatorId = ignoreCreatorId ? '' : useUser.computed.userId;
    if (creatorId) {
      config.params = {
        creatorId,
      };
    }
    return config;
  };
};

const getForum: ModuleGetter<This> = function () {
  return (forumActionId: string) => {
    const entityId = useEntities.getters.getEntityIdFromActionId(forumActionId, EntityType.Forum);
    if (!entityId) {
      return;
    }
    const forumData = useEntities.getters.getEntity(entityId) as ForumJson;
    return forumData;
  };
};

const getForumConfig: ModuleGetter<This> = function () {
  return (actionId: string, ignoreCreatorId: boolean = false): ApiRequestConfig => {
    const config: ApiRequestConfig = {
      baseURL: useApi.computed.baseUrl,
      url: '/entities/forum/:forumActionId',
      subDirectories: {
        forumActionId: actionId,
      },
    };
    const creatorId = ignoreCreatorId ? '' : useUser.computed.userId;
    if (creatorId) {
      config.params = {
        creatorId,
      };
    }
    return config;
  };
};

const getCreateForumActionCreateInput: ModuleGetter<This> = function () {
  return (title: string, body: string) => {
    const forumBody: ActionCreateInput<EntityType.Forum, Crud.Post> = {
      crud: Crud.Post,
      type: EntityType.Forum,
      params: { title, body },
    };

    return forumBody;
  };
};

const getPendingForumId: ModuleGetter<This> = function () {
  return (forumActionCreateInput: ActionCreateInput<EntityType.Forum, Crud.Post>) => {
    const composedId = useActions.getters.getComposedIdFromCreateActionInput(
      forumActionCreateInput,
      EntityType.Forum,
      Crud.Post
    );
    const pending = useLocalState.getters.getPendingIdOfType(composedId);
    return getActionIdFromOptimisticActionId(pending.actionId);
  };
};

export const getters: ModuleForumsGetters = {
  getNewestForumsConfig,
  getForum,
  getForumConfig,
  getCreateForumActionCreateInput,
  getPendingForumId,
};
