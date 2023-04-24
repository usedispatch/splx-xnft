import { FlatList, Text } from "react-native";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useDidLaunch, usePublicKey, usePublicKeys } from "../hooks/xnft-hooks";

import { Screen } from "../components/Screen";
import tw from "twrnc";
import { useEffect } from "react";
import { useSolanaConnection } from "../hooks/xnft-hooks";

// import { useSolanaConnection } from "../hooks/xnft-hooks";

export function HomeScreen() {
  const features = [
    "tailwind",
    "recoil",
    "native styling",
    "fetching code from an API",
    "using a FlatList to render data",
    "Image for both remote & local images",
    "custom fonts",
    "sign a transaction / message",
    "theme hook with light/dark support",
  ];
  console.log('start here');
  const d = useDidLaunch();
  const c = useSolanaConnection();
  const p = usePublicKey();
  console.log('p:', p);
  // useEffect(() => {console.log('use effect', p)}, [p])
  
  if (p) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: p,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      })
    );
    console.log('tx:', transaction);
  }
  
  // const connection = useSolanaConnection();
  // console.log('conn', connection);
  return (
    <Screen>
      <Text style={tw`mb-4`}>
        Solarplex v1
        {p?.toBase58()}
      </Text>
      
    </Screen>
  );
}
