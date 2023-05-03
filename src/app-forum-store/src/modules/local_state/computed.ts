import { ModuleLocalStateComputed, ThisLocalState as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';

const pendingActionId: ModuleComputed<This> = function () {
  return `Pending${this.state.pendingTime.ct}`;
};

export const computed: ModuleLocalStateComputed = {
  pendingActionId,
};
