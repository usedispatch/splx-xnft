import { ChainId } from '@dispatch-services/db-forum-common/chains';
import { ModuleBlockchainState } from './types';

export const name = 'blockchain';
export function getInitialState(): ModuleBlockchainState {
  return {
    wallet: undefined,
    chainId: ChainId.Unknown,
    connected: false,
    commitment: undefined,
  };
}
