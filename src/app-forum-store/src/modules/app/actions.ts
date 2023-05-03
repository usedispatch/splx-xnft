import { ActionCreateInput, Crud, getLastActionIdFromId } from '@dispatch-services/db-forum-common/actions';
import { EntityType, getActionIdFromOptimisticActionId } from '@dispatch-services/db-forum-common/entities';
import { ModuleAppActions, ThisApp as This } from './types';
import { useForums, useLocalState, useTopics, useWallet } from '@dispatch-services/app-forum-store/modules';

import { ModuleAction } from '@dispatch-services/store';

const redirect: ModuleAction<This> = async function (actionInput: ActionCreateInput<any, any>) {
  let actionId: string;
  let path: string;
  if (
    actionInput.crud === Crud.Post &&
    (actionInput.type === EntityType.Topic || actionInput.type === EntityType.ProductTopic)
  ) {
    actionId = useTopics.getters.getPendingTopicId(actionInput as ActionCreateInput<EntityType.Topic, Crud.Post>);
    path = `/topic/${getActionIdFromOptimisticActionId(actionId)}`;
  } else {
    actionId = useForums.getters.getPendingForumId(actionInput as ActionCreateInput<EntityType.Forum, Crud.Post>);
    path = `/forum/${getActionIdFromOptimisticActionId(actionId)}`;
  }
  if (actionInput.crud === Crud.Put) {
    actionId = useLocalState.getters.isPendingId(actionInput.crudEntityId ?? '')
      ? getActionIdFromOptimisticActionId(actionInput.crudEntityId as string)
      : getLastActionIdFromId(actionInput.crudEntityId as string);
    path = `/topic/${actionId}`;
  }
  window.history.pushState({}, '', path);
  const navEvent = new PopStateEvent('popstate');
  window.dispatchEvent(navEvent);
};

const gatedNavigation: ModuleAction<This> = async function (href: string) {
  await useWallet.actions.waitForWalletConnect();
  window.history.pushState({}, '', href);
  const navEvent = new PopStateEvent('popstate');
  window.dispatchEvent(navEvent);
};

export const actions: ModuleAppActions = {
  redirect,
  gatedNavigation,
};
