import { ModuleEntitiesComputed, ThisEntities as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';

const pendingEntities: ModuleComputed<This> = function () {
  return [];
};

export const computed: ModuleEntitiesComputed = {
  pendingEntities,
};
