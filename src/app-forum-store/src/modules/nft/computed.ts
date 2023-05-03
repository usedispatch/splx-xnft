import { ModuleNftComputed, ThisNft as This } from './types';

import { ModuleComputed } from '@dispatch-services/store';

const hasClaimed: ModuleComputed<This> = function () {
  return this.state.nftMint === undefined;
};

export const computed: ModuleNftComputed = {
  hasClaimed,
};
