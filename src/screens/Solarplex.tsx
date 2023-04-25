import * as Linking from "expo-linking";

import { Button, Image, Text } from "react-native";

import { Screen } from "../components/Screen";
import { Section } from "../components/Section";
import { fetchForum } from "../solarplex/api";
import { useEffect } from "react";

export function Solarplex() : JSX.Element {
  useEffect(()=>{
    const doFetch = async () => {
      const result = await fetchForum();
      console.log('result: ', result);
    }
    doFetch();
  })
  return (
    <Screen>
      <Section title="Whats in your Wallet?">
        <Text>
        Hello
        </Text>
      </Section>
    </Screen>
  );
}
