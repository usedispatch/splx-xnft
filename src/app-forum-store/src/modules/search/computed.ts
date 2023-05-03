import { ModuleSearchComputed, ThisSearch as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';

const exampleComputed: ModuleComputed<This> = function () {
  return 1;
};

export const computed: ModuleSearchComputed = {
  exampleComputed,
};
