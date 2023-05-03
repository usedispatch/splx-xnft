import { getInitialState, name } from './state';

import { actions } from './actions';
import { computed } from './computed';
import { create } from '@dispatch-services/store';
import { getters } from './getters';

export * from './types';
// TODO(zfaizal2): rename to entitiesStore
export const useEntities = create<ReturnType<typeof getInitialState>, typeof computed, typeof getters, typeof actions>(
  () => ({
    name,
    state: getInitialState(),
    computed,
    getters,
    actions,
  })
);
