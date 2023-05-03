import { getInitialState, name } from './state';

import { actions } from './actions';
import { computed } from './computed';
import { create } from '@dispatch-services/store';
import { getters } from './getters';
import { useUser } from '../user';

export * from './types';

export const useNotifications = create<
  ReturnType<typeof getInitialState>,
  typeof computed,
  typeof getters,
  typeof actions
>(() => ({
  name,
  state: getInitialState(),
  computed,
  getters,
  actions,
}));

useUser.subscribe(
  (module) => module.computed.userId,
  async (newUserId, oldUserId) => {
    if (oldUserId) {
      await useNotifications.actions.stopPoller(oldUserId);
    }
    if (newUserId) {
      void useNotifications.actions.startPoller(newUserId);
    }
  }
);
