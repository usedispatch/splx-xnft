import { ModuleApiComputed, ThisApi as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';

const baseUrl: ModuleComputed<This> = function () {
  const realm = process.env.SOLARPLEX_REALM;
  switch (realm || process.env.REALM) {
    case 'dev':
      return 'https://dev.api.solarplex.xyz';
    case 'prod':
      return 'https://prod.api.solarplex.xyz';
    default:
      return 'http://localhost:3001';
  }
};

export const computed: ModuleApiComputed = {
  baseUrl,
};
