import { ModuleAction, useHttp } from '@dispatch-services/store';
import { ModuleNftActions, ThisNft as This } from './types';

import { VersionedTransaction } from '@solana/web3.js';
import { decode as bs58Decode } from 'bs58';
import { useBlockchain } from '../blockchain';
import { useUser } from '../user';
import { useWallet } from '../wallet';

interface NftMint {
  id: string;
  status: string;
  transferable: boolean;
  compressed: boolean;
  projectId: number;
  mintAddress: string;
  claimerAddress: string;
  name: string;
  image: string;
  attributes: {
    type: string;
    events: string;
  };
}

const checkClaim: ModuleAction<This> = async function () {
  const nftMintConfig = await this.getters.getNftMintAddressConfig(useUser.computed.walletId);
  const nftMintResponse = await useHttp.actions.get(nftMintConfig);
  const nftMint = (nftMintResponse?.data?.results as NftMint[])?.find((mint) => mint.status === 'pending')?.mintAddress;
  if (nftMint) {
    this.setState((state) => {
      state.nftMint = nftMint;
    });
  }
};

const claim: ModuleAction<This> = async function () {
  const nftMint = this.state.nftMint;
  if (!nftMint) {
    throw Error('This NFT has already been claimed, if you think this is a mistake, please file a Bug Report.');
  }
  const claimTransactionConfig = this.getters.getClaimTransactionConfig(useUser.computed.walletId, nftMint);
  const claimTransactionResponse = await useHttp.actions.post(claimTransactionConfig);
  const transaction = VersionedTransaction.deserialize(bs58Decode(claimTransactionResponse.data.transaction));
  await useWallet.computed.wallet
    ?.sendTransaction(transaction, useBlockchain.computed.useConnection, {
      skipPreflight: false,
    })
    .then(() => {
      this.setState((state) => {
        state.nftMint = undefined;
      });
    });
};

export const actions: ModuleNftActions = {
  checkClaim,
  claim,
};
