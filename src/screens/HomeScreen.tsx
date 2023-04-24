import { FlatList, Text } from "react-native";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useDidLaunch, usePublicKeys } from "../hooks/xnft-hooks";

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
  const p = usePublicKeys();
  console.log('c, p', c, p);
  useEffect(() => {console.log('use effect', p)}, [p])

  // function doSomething() {
  //   useEffect(() => {
  //     console.log('lets start');
  //     const publicKeys = usePublicKeys()  ;
  //     console.log('keys: ', publicKeys);
  //   });
  // }
  // doSomething();
  // const transaction = new Transaction().add(
  //   SystemProgram.transfer({
  //     fromPubkey: publicKey,
  //     toPubkey: Keypair.generate().publicKey,
  //     lamports: 1_000_000,
  //   })
  // );
  
  // const connection = useSolanaConnection();
  // console.log('conn', connection);
  return (
    <Screen>
      <Text style={tw`mb-4`}>
        Solarplex v1
        {p?.solana.toString()}
      </Text>
      
    </Screen>
  );
}
