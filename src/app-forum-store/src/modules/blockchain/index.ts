import { getInitialState, name } from './state';

import { actions } from './actions';
import { computed } from './computed';
import { create } from '@dispatch-services/store';
import { getters } from './getters';
import { useUser } from '../user';

export * from './types';

export const useBlockchain = create<
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

useBlockchain.subscribe(
  (module) => {
    return module.state.wallet?.publicKey?.toBase58() ?? '';
  },
  async (newWallet, oldWallet) => {
    if (useBlockchain.state.wallet && newWallet) {
      await useUser.actions.setOrCreateUser(useBlockchain.state.wallet.publicKey);
    } else if (oldWallet && !newWallet) {
      await useUser.actions.logout();
    }
  }
);
