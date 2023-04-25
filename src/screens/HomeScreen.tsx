import { Button, Image } from "react-native";
import { FlatList, Text } from "react-native";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useDidLaunch, usePublicKey, usePublicKeys, useSolana } from "../hooks/xnft-hooks";

import { Screen } from "../components/Screen";
// import { useSolanaConnection } from "../hooks/xnft-hooks";
import { generateTagId } from '@dispatch-services/db-forum-common/entities';
import tw from "twrnc";
import { useAppStore } from "../store";
import { useEffect } from "react";
import { useSolanaConnection } from "../hooks/xnft-hooks";

const walletSandb1x = '8CKzyXxWV5n4iojkTMu6XRr4AZXdD9GzRyP5fRCpT5LM';
const walletSandb0x = 'Gvr5EbG96PBWAuethws7RRNnHGQDDhbbnAVGt8cZEAUu';

export function HomeScreen() : JSX.Element  {
  const {ctr, increase }= useAppStore();
  
  console.log('start here', generateTagId);
  const d = useDidLaunch();
  const c = useSolanaConnection();
  const s = useSolana();
  const p = usePublicKey();
  console.log('p:', p);
  // useEffect(() => {console.log('use effect', p)}, [p])
  
  useEffect(() => {
    const doTx = async () => {
      if (p) {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: p,
            toPubkey: new PublicKey(walletSandb1x),
            lamports: 1,
          })  
        );
        console.log('tx:', transaction);
        const result = await window.xnft.solana.sendAndConfirm(transaction);
        console.log("solana sign and confirm transaction", result);
      }
    }
    // doTx();
  })
  
  
  // const connection = useSolanaConnection();
  // console.log('conn', connection);
  return (
    <Screen>
      <Text style={tw`mb-4`}>
        Solarplex v1
        <br/>
        Pubkey: {p?.toBase58()}
        <br/>
        <br/>
        Ctr: {ctr}
      </Text>
      <Button
          title={`The ctr is ${ctr}`}
          color={
            ctr > 0 ? "rgb(228, 208, 10)" : "rgb(33, 150, 243)"
          }
          onPress={() => increase(1)}
        />
    </Screen>
  );
}
