import { getInitialState, name } from './state';

import { actions } from './actions';
import { computed } from './computed';
import { create } from '@dispatch-services/store';
import { getters } from './getters';
import { tryEachAnimationFrame } from '@dispatch-services/utils-common/timers';
import { useUser } from '../user';

export const useActions = create<ReturnType<typeof getInitialState>, typeof computed, typeof getters, typeof actions>(
  () => ({
    name,
    state: getInitialState(),
    computed,
    getters,
    actions,
  })
);

useActions.subscribe(
  (module) => !module.computed.isPolling && module.computed.hasPendingAction,
  (n) => {
    if (n) {
      // Need to wait a tick so that isBusy is set to false (this will fire before that).
      tryEachAnimationFrame(() => !useActions.getters.getPendingActionsIsBusy(), 100)
        .then(async () => {
          void useActions.actions.getPendingActions();
        })
        .finally(() => {});
    }
  }
);

useUser.subscribe(
  (module) => module.computed.userId,
  async (newUserId, oldUserId) => {
    if (oldUserId) {
      await useActions.actions.stopPoller(oldUserId);
    }
    if (newUserId) {
      void useActions.actions.getPendingActions();
    }
  }
);
