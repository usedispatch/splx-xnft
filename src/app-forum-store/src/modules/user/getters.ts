import { ModuleUserGetters, ThisUser as This } from './types';

import { ModuleGetter } from '@dispatch-services/store';

// TODO(partyman): refactor to avoid no-ops
const noOpForLint: ModuleGetter<This> = function () {
  return () => {
    return null;
  };
};

export const getters: ModuleUserGetters = {
  noOpForLint,
};
